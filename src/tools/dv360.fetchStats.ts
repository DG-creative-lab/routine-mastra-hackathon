// src/tools/dv360.fetchStats.ts
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { withDemo, rand } from "@/utils";
import { BigQuery } from "@google-cloud/bigquery";
import { loadFixture, listFixtureNames } from "@/utils/fixtures";

/**
 * REAL path: BigQuery export
 * DEMO path: local fixture → synthetic fallback
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

const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID;
const BQ_DATASET    = process.env.BQ_DATASET;
const BQ_TABLE      = process.env.BQ_TABLE_DV360;

const COL_DEAL = process.env.BQ_DEAL_ID_COL     ?? "deal_id";
const COL_IMP  = process.env.BQ_IMPRESSIONS_COL ?? "impressions";
const COL_COST = process.env.BQ_COST_COL        ?? "media_cost_advertiser";
const COL_DATE = process.env.BQ_DATE_COL        ?? "date";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

function bqClient(): BigQuery {
  if (!BQ_PROJECT_ID || !BQ_DATASET || !BQ_TABLE) {
    throw new Error(
      "Missing BigQuery env. Set BQ_PROJECT_ID, BQ_DATASET, BQ_TABLE_DV360 (or run with DEMO_MODE=true)."
    );
  }
  return new BigQuery({ projectId: BQ_PROJECT_ID });
}

async function fetchFromBigQuery(
  dealIds: string[],
  lookbackDays: number
): Promise<Dv360FetchStatsOutput> {
  const bq = bqClient();

  const end   = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - lookbackDays);

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

  const params = { start: ymd(start), end: ymd(end), dealIds };
  const [rows] = await bq.query({ query: sql, params });

  const map = new Map<string, number>();
  for (const r of rows as Array<{ dealId: string; avgCpm: number }>) {
    map.set(String(r.dealId), Number(r.avgCpm) || 0);
  }

  const out = dealIds.map((id) => ({
    dealId: id,
    avgCpm: Number((map.get(id) ?? 0).toFixed(2)),
  }));

  return outputSchema.parse(out);
}

async function fakeFromFixtureOrSynth(
  dealIds: string[],
  lookbackDays: number
): Promise<Dv360FetchStatsOutput> {
  try {
    const variants = await listFixtureNames("dv360.fetchStats");
    if (variants.length) {
      const data = (await loadFixture("dv360.fetchStats", variants[0])) as Array<{ dealId?: string; avgCpm: number }>;
      const out = dealIds.map((id, i) => ({
        dealId: id,
        avgCpm: Number((data[i % data.length]?.avgCpm ?? 8 + rand() * 8).toFixed(2)),
      }));
      return outputSchema.parse(out);
    }
  } catch { /* ignore */ }

  const jitter = Math.max(0, Math.min(90, lookbackDays)) * 0.03;
  const out = dealIds.map((id) => ({
    dealId: id,
    avgCpm: Number((6 + rand() * (12 + jitter)).toFixed(2)),
  }));
  return outputSchema.parse(out);
}

export const dv360FetchStats = createTool<typeof inputSchema, typeof outputSchema>({
  id:          "dv360.fetchStats",
  description: "Fetch last N-day avg CPM for each DV360 deal (BQ in real mode; fixture/synthetic in demo).",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { dealIds, lookbackDays } = inputSchema.parse(context as unknown);

    return withDemo(
      () => fetchFromBigQuery(dealIds, lookbackDays),
      () => fakeFromFixtureOrSynth(dealIds, lookbackDays)
    );
  },
});

export default dv360FetchStats;