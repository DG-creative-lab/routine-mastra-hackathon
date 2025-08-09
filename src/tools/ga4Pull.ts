import "server-only";
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { GoogleAuth } from "google-auth-library";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { withDemo, rand } from "@/utils";

/*──────────────────────────────────────────────────────────────┐
  Env
 └──────────────────────────────────────────────────────────────*/
const PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? "";
const KEY_FILE    = process.env.GA4_KEY_FILE ?? "";
const DEFAULT_METRICS    = (process.env.GA4_DEFAULT_METRICS ?? "totalRevenue").split(",").map(s => s.trim()).filter(Boolean);
const DEFAULT_DIMENSIONS = (process.env.GA4_DEFAULT_DIMENSIONS ?? "date").split(",").map(s => s.trim()).filter(Boolean);

/*──────────────────────────────────────────────────────────────┐
  Schemas
 └──────────────────────────────────────────────────────────────*/
export const inputSchema = z.object({
  lookbackDays : z.number().int().min(1).max(30).default(1),
  metrics      : z.array(z.string()).optional(),
  dimensions   : z.array(z.string()).optional(),
  /**
   * Optional: compute aggregate ROAS = sum(revenueMetric)/sum(costMetric)
   * Example: { revenueMetric: "totalRevenue", costMetric: "advertiserAdCost" }
   */
  computeRoas  : z.object({
    revenueMetric: z.string(),
    costMetric:    z.string(),
  }).optional(),
});
export type Ga4PullInput = z.infer<typeof inputSchema>;

/**
 * We return both tabular data (rows, headers) and an optional `roas`.
 * Keeping it flexible lets other agents consume arbitrary metrics too.
 */
export const outputSchema = z.object({
  headers: z.array(z.string()),
  rows:    z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
  roas:    z.number().optional(),
});
export type Ga4PullOutput = z.infer<typeof outputSchema>;

type Ga4RowObj = Record<string, string | number | null>;

const fmt = (d: Date) => d.toISOString().slice(0, 10);

function toRow(headers: string[], row: any): Ga4RowObj {
  // GA4 returns arrays of dimensionValues and metricValues in same order as headers.
  // We map across headers -> pick from dimValues first, then metrics.
  const out: Ga4RowObj = {};
  let di = 0;
  let mi = 0;

  const dimCount = (row.dimensionValues?.length ?? 0);
  const metCount = (row.metricValues?.length ?? 0);

  for (const key of headers) {
    if (di < dimCount) {
      out[key] = row.dimensionValues[di++]?.value ?? null;
    } else if (mi < metCount) {
      const v = row.metricValues[mi++]?.value ?? null;
      // try parse numbers if look numeric
      out[key] = (v != null && v !== "" && !Number.isNaN(Number(v))) ? Number(v) : v;
    } else {
      out[key] = null;
    }
  }
  return out;
}

export const ga4Pull = createTool<typeof inputSchema, typeof outputSchema>({
  id: "ga4.pull",
  description: "GA4 runReport wrapper. Returns rows, headers, and optional aggregate ROAS.",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { lookbackDays, metrics, dimensions, computeRoas } = inputSchema.parse(context as unknown);

    const real = async (): Promise<Ga4PullOutput> => {
      if (!PROPERTY_ID) throw new Error("GA4_PROPERTY_ID is not set.");
      if (!KEY_FILE)    throw new Error("GA4_KEY_FILE is not set (service-account JSON path).");

      const end   = new Date();
      const start = new Date(end);
      start.setDate(end.getDate() - lookbackDays);

      const auth    = new GoogleAuth({
        keyFile: KEY_FILE,
        scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      });
      const client  = new BetaAnalyticsDataClient({ auth });

      const req = {
        property: `properties/${PROPERTY_ID}`,
        dateRanges: [{ startDate: fmt(start), endDate: fmt(end) }],
        metrics:    (metrics ?? DEFAULT_METRICS).map((name) => ({ name })),
        dimensions: (dimensions ?? DEFAULT_DIMENSIONS).map((name) => ({ name })),
      };

      const [res] = await client.runReport(req);

      const headers: string[] = [
        ...(res.dimensionHeaders ?? []).map((h) => h.name || "").filter(Boolean),
        ...(res.metricHeaders    ?? []).map((h) => h.name || "").filter(Boolean),
      ];

      const rows = (res.rows ?? []).map((r) => toRow(headers, r));

      // Optionally compute ROAS across all rows:
      let roas: number | undefined;
      if (computeRoas) {
        const rev = rows.reduce((acc, r) => acc + (Number(r[computeRoas.revenueMetric]) || 0), 0);
        const cost = rows.reduce((acc, r) => acc + (Number(r[computeRoas.costMetric]) || 0), 0);
        roas = cost > 0 ? rev / cost : 0;
      }

      return outputSchema.parse({ headers, rows, roas });
    };

    const fake = async (): Promise<Ga4PullOutput> => {
      // Generate tiny daily time-series for the lookback window.
      // If computeRoas is provided, create metrics that produce a believable ROAS ~ 2.0–5.0.
      const dims = dimensions ?? DEFAULT_DIMENSIONS;
      const mets = metrics ?? DEFAULT_METRICS;

      const end   = new Date();
      const start = new Date(end);
      start.setDate(end.getDate() - lookbackDays);

      // Build header order: dims then metrics (like GA4)
      const headers = [...dims, ...mets];

      const days: string[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(fmt(d));
      }

      const rows: Ga4RowObj[] = days.map((date) => {
        const row: Ga4RowObj = {};
        // put dimension values
        for (const d of dims) row[d] = d.toLowerCase() === "date" ? date : d;
        // create fake metrics
        for (const m of mets) {
          // bias revenue & cost
          const base = 100 + rand() * 300;
          row[m] = Number(base.toFixed(2));
        }
        // If asked to compute ROAS, inject revenue/cost pattern
        if (computeRoas) {
          const rev = 200 + rand() * 800;
          const cost = 50 + rand() * 300;
          row[computeRoas.revenueMetric] = Number(rev.toFixed(2));
          row[computeRoas.costMetric]    = Number(cost.toFixed(2));
        }
        return row;
      });

      let roas: number | undefined;
      if (computeRoas) {
        const rev = rows.reduce((a, r) => a + (Number(r[computeRoas.revenueMetric]) || 0), 0);
        const cost = rows.reduce((a, r) => a + (Number(r[computeRoas.costMetric]) || 0), 0);
        roas = cost > 0 ? Number((rev / cost).toFixed(3)) : 0;
      }

      return outputSchema.parse({ headers, rows, roas });
    };

    return withDemo(real, fake);
  },
});

export default ga4Pull;