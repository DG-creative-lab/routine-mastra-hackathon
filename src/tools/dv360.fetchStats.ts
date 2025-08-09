import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { withDemo, rand } from "@/utils";
import { BigQuery } from "@google-cloud/bigquery";
import fs from "fs/promises";
import path from "path";

/**
 * REAL path:
 *   - Reads DV360 facts from your BigQuery export (recommended for prod).
 *   - Computes avg CPM per deal over the last N days.
 *
 * DEMO path:
 *   - Returns synthetic CPMs or a local fixture if present.
 *
 * Required env (real):
 *   BQ_PROJECT_ID=...
 *   BQ_DATASET=...
 *   BQ_TABLE_DV360=...               # e.g. dv360_daily
 * Optional column overrides (if your schema differs):
 *   BQ_DEAL_ID_COL=deal_id
 *   BQ_IMPRESSIONS_COL=impressions
 *   BQ_COST_COL=media_cost_advertiser
 *   BQ_DATE_COL=date
 * Auth:
 *   GOOGLE_APPLICATION_CREDENTIALS must be set or ADC available.
 */

export const inputSchema = z.object({
  dealIds: z.array(z.string()).nonempty(),
  lookbackDays: z.number().int().min(1).max(90).default(7),
});
export type Dv360FetchStatsInput = z.infer<typeof inputSchema>;

export const outputSchema = z.array(
  z.object({
    dealId: z.string(),
    avgCpm: z.number(), // USD CPM
  })
);
export type Dv360FetchStatsOutput = z.infer<typeof outputSchema>;

/* ── Env & defaults ───────────────────────────────────────── */
const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID;
const BQ_DATASET    = process.env.BQ_DATASET;
const BQ_TABLE      = process.env.BQ_TABLE_DV360;

const COL_DEAL = process.env.BQ_DEAL_ID_COL       ?? "deal_id";
const COL_IMP  = process.env.BQ_IMPRESSIONS_COL   ?? "impressions";
const COL_COST = process.env.BQ_COST_COL          ?? "media_cost_advertiser";
const COL_DATE = process.env.BQ_DATE_COL          ?? "date";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function bqClient(): BigQuery {
  if (!BQ_PROJECT_ID || !BQ_DATASET || !BQ_TABLE) {
    throw new Error(
      "Missing BigQuery env. Set BQ_PROJECT_ID, BQ_DATASET, BQ_TABLE_DV360 (or run with DEMO_MODE=true)."
    );
  }
  return new BigQuery({ projectId: BQ_PROJECT_ID });
}

export const dv360FetchStats = createTool<typeof inputSchema, typeof outputSchema>({
  id:          "dv360.fetchStats",
  description: "Fetch last N-day avg CPM for each DV360 deal ID (BigQuery export in real mode, synthetic in demo).",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { dealIds, lookbackDays } = inputSchema.parse(context as unknown);

    const real = async (): Promise<Dv360FetchStatsOutput> => {
      const bq = bqClient();

      const end   = new Date();
      const start = new Date(end);
      start.setDate(end.getDate() - lookbackDays);

      // Compose fully-qualified table and safe SQL with parameter binding
      const fqTable = `\`${BQ_PROJECT_ID}.${BQ_DATASET}.${BQ_TABLE}\``;
      const sql = `
        SELECT
          CAST(${COL_DEAL} AS STRING) AS dealId,
          SAFE_MULTIPLY(
            SAFE_DIVIDE(SUM(${COL_COST}), NULLIF(SUM(${COL_IMP}), 0)),
            1000
          ) AS avgCpm
        FROM ${fqTable}
        WHERE ${COL_DATE} BETWEEN @start AND @end
          AND ${COL_DEAL} IN UNNEST(@dealIds)
        GROUP BY dealId
      `;

      const params = {
        start: ymd(start),
        end:   ymd(end),
        dealIds,
      };

      const [rows] = await bq.query({ query: sql, params });

      // Map results for fast lookup, then ensure we return *every* requested dealId in input order
      const map = new Map<string, number>();
      for (const r of rows as Array<{ dealId: string; avgCpm: number }>) {
        map.set(String(r.dealId), Number(r.avgCpm) || 0);
      }

      const out = dealIds.map((id) => ({
        dealId: id,
        avgCpm: Number((map.get(id) ?? 0).toFixed(2)),
      }));

      return outputSchema.parse(out);
    };

    const fake = async (): Promise<Dv360FetchStatsOutput> => {
      // If you have a local fixture, prefer it for repeatable demos
      const fixturePath = path.resolve(process.cwd(), "specs/demo-fixtures/dv360.deal_stats.json");
      try {
        const raw = JSON.parse(await fs.readFile(fixturePath, "utf-8")) as Record<string, number>;
        const results = dealIds.map((dealId) => ({
          dealId,
          avgCpm: typeof raw[dealId] === "number"
            ? Number(raw[dealId].toFixed(2))
            : Number((5 + rand() * 15).toFixed(2)), // $5–$20 fallback
        }));
        return outputSchema.parse(results);
      } catch {
        // Synthesize plausible CPMs with slight lookback jitter so repeated demos vary subtly
        const jitter = Math.max(0, Math.min(90, lookbackDays)) * 0.03;
        const results = dealIds.map((dealId) => ({
          dealId,
          avgCpm: Number((6 + rand() * (12 + jitter)).toFixed(2)),
        }));
        return outputSchema.parse(results);
      }
    };

    return withDemo(real, fake);
  },
});

export default dv360FetchStats;