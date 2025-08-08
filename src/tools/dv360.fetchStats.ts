import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { GoogleAuth } from "google-auth-library";
import { displayvideo_v1 } from "@googleapis/displayvideo";

const inputSchema = z.object({
  dealIds:      z.array(z.string()).nonempty(),
  lookbackDays: z.number().int().min(1).max(30).default(7),
});
export type Dv360FetchStatsInput = z.infer<typeof inputSchema>;

const outputSchema = z.array(
  z.object({
    dealId: z.string(),
    avgCpm: z.number(),
  })
);
export type Dv360FetchStatsOutput = z.infer<typeof outputSchema>;

const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS!,
  scopes:  ["https://www.googleapis.com/auth/display-video"],
});
const dv360 = new displayvideo_v1.Displayvideo({ auth });

export const dv360FetchStats = createTool({
  id:          "dv360.fetchStats",
  description: "Fetch last N-day avg CPM for each DV360 deal ID.",
  inputSchema,
  outputSchema,

  async execute({ context }) {
    const { dealIds, lookbackDays } = inputSchema.parse(context);

    // 1) Build date range
    const end   = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - lookbackDays);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // 2) Kick off report
    const [resp] = await (dv360.advertisers.lineItems as any).runReports({
      advertiserId: process.env.DV360_ADVERTISER_ID!,
      requestBody: {
        entity:     { filter: { entityType: "DEAL", ids: dealIds } },
        dataRange:  { startDate: fmt(start), endDate: fmt(end) },
        metrics:    [{ metricName: "MEDIA_COST" }, { metricName: "IMPRESSIONS" }],
        dimensions: [{ dimensionName: "DEAL" }],
      },
    });

    // 3) Infer row type & compute avgCpm
    type Row = NonNullable<typeof resp.rows>[number];
    const rows: Row[] = resp.rows ?? [];

    return rows.map((r) => {
      const dealId      = r.dimensionValues![0].value!;
      const costMicros  = parseFloat(r.metricValues![0].value!);
      const impressions = parseFloat(r.metricValues![1].value!);
      const avgCpm      =
        (costMicros / 1_000_000 / (impressions || 1)) * 1000;
      return { dealId, avgCpm };
    });
  },
});

export default dv360FetchStats;