import "server-only";
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { GoogleAuth } from "google-auth-library";
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { withDemo, rand } from "@/utils";
import { loadFixture, listFixtureNames } from "@/utils/fixtures";

/*──────────────────────────────────────────────────────────────┐
  Env
 └──────────────────────────────────────────────────────────────*/
const PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? "";
const KEY_FILE    = process.env.GA4_KEY_FILE ?? "";
const DEFAULT_METRICS    = (process.env.GA4_DEFAULT_METRICS ?? "totalRevenue")
  .split(",").map(s => s.trim()).filter(Boolean);
const DEFAULT_DIMENSIONS = (process.env.GA4_DEFAULT_DIMENSIONS ?? "date")
  .split(",").map(s => s.trim()).filter(Boolean);

/*──────────────────────────────────────────────────────────────┐
  Schemas
 └──────────────────────────────────────────────────────────────*/
export const inputSchema = z.object({
  lookbackDays : z.number().int().min(1).max(30).default(1),
  metrics      : z.array(z.string()).optional(),
  dimensions   : z.array(z.string()).optional(),
  computeRoas  : z.object({
    revenueMetric: z.string(),
    costMetric:    z.string(),
  }).optional(),
});
export type Ga4PullInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  headers: z.array(z.string()),
  rows:    z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
  roas:    z.number().optional(),
});
export type Ga4PullOutput = z.infer<typeof outputSchema>;

type Ga4RowObj = Record<string, string | number | null>;
const fmt = (d: Date) => d.toISOString().slice(0, 10);

function toRow(headers: string[], row: any): Ga4RowObj {
  const out: Ga4RowObj = {};
  let di = 0, mi = 0;
  const dimCount = (row.dimensionValues?.length ?? 0);
  const metCount = (row.metricValues?.length ?? 0);

  for (const key of headers) {
    if (di < dimCount) {
      out[key] = row.dimensionValues[di++]?.value ?? null;
    } else if (mi < metCount) {
      const v = row.metricValues[mi++]?.value ?? null;
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

      const auth   = new GoogleAuth({ keyFile: KEY_FILE, scopes: ["https://www.googleapis.com/auth/analytics.readonly"] });
      const client = new BetaAnalyticsDataClient({ auth });

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

      let roas: number | undefined;
      if (computeRoas) {
        const rev  = rows.reduce((a, r) => a + (Number(r[computeRoas.revenueMetric]) || 0), 0);
        const cost = rows.reduce((a, r) => a + (Number(r[computeRoas.costMetric])    || 0), 0);
        roas = cost > 0 ? rev / cost : 0;
      }

      return outputSchema.parse({ headers, rows, roas });
    };

    const fake = async (): Promise<Ga4PullOutput> => {
      // Try fixture first: src/fixtures/ga4.pull/*.json
      // Supported fixture shapes:
      //  1) { "headers": [...], "rows": [...], "roas": 3.2 }
      //  2) [ {date: "...", metricA: 123, ...}, ... ]  (headers inferred)
      try {
        const variants = await listFixtureNames("ga4.pull");
        if (variants.length) {
          const data = await loadFixture("ga4.pull", variants[0]);
          if (Array.isArray(data)) {
            const keys = new Set<string>();
            data.forEach((r: Record<string, any>) => Object.keys(r).forEach(k => keys.add(k)));
            const headers = Array.from(keys);
            return outputSchema.parse({ headers, rows: data as any[], roas: undefined });
          } else if (data && typeof data === "object") {
            const { headers, rows, roas } = data as any;
            if (Array.isArray(headers) && Array.isArray(rows)) {
              return outputSchema.parse({ headers, rows, roas });
            }
          }
        }
      } catch { /* fallthrough to synthetic */ }

      // Synthetic timeseries
      const dims = dimensions ?? DEFAULT_DIMENSIONS;
      const mets = metrics ?? DEFAULT_METRICS;

      const end   = new Date();
      const start = new Date(end);
      start.setDate(end.getDate() - lookbackDays);

      const headers = [...dims, ...mets];
      const days: string[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(fmt(d));

      const rows: Ga4RowObj[] = days.map((date) => {
        const row: Ga4RowObj = {};
        for (const d of dims) row[d] = d.toLowerCase() === "date" ? date : d;
        for (const m of mets) row[m] = Number((100 + rand() * 300).toFixed(2));
        if (computeRoas) {
          row[computeRoas.revenueMetric] = Number((200 + rand() * 800).toFixed(2));
          row[computeRoas.costMetric]    = Number((50 + rand() * 300).toFixed(2));
        }
        return row;
      });

      let roas: number | undefined;
      if (computeRoas) {
        const rev  = rows.reduce((a, r) => a + (Number(r[computeRoas.revenueMetric]) || 0), 0);
        const cost = rows.reduce((a, r) => a + (Number(r[computeRoas.costMetric])    || 0), 0);
        roas = cost > 0 ? Number((rev / cost).toFixed(3)) : 0;
      }

      return outputSchema.parse({ headers, rows, roas });
    };

    return withDemo(real, fake);
  },
});

export default ga4Pull;