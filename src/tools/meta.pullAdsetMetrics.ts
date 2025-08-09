import "server-only";
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { withDemo, rand } from "@/utils";

/**
 * Env:
 *   META_ACCESS_TOKEN=  // Marketing API token with ads_read
 */

export const inputSchema = z.object({
  adSetIds: z.array(z.string()).nonempty(),
  /** Optional window (hours). We still pass date-based range to Graph API. */
  lookbackHours: z.number().int().min(1).max(72).default(24),
});
export type MetaPullAdsetMetricsInput = z.infer<typeof inputSchema>;

export const outputSchema = z.array(
  z.object({
    adSetId: z.string(),
    frequency: z.number(),     // average frequency
    audienceSize: z.number(),  // reach (used as audience proxy)
  })
);
export type MetaPullAdsetMetricsOutput = z.infer<typeof outputSchema>;

// Minimal zod schema for the Graph API "insights" response we use
const insightsRowSchema = z.object({
  frequency: z.string().optional(),
  reach: z.string().optional(),
});
const insightsResponseSchema = z.object({
  data: z.array(insightsRowSchema).optional().default([]),
});

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchAdsetInsights(params: {
  adSetId: string;
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
  accessToken: string;
}) {
  const { adSetId, since, until, accessToken } = params;

  const base = `https://graph.facebook.com/v19.0/${encodeURIComponent(adSetId)}/insights`;
  const search = new URLSearchParams({
    fields: "frequency,reach",
    time_range: JSON.stringify({ since, until }),
    limit: "1",
    access_token: accessToken,
  });

  const url = `${base}?${search.toString()}`;
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Meta insights request failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as unknown;
  const parsed = insightsResponseSchema.parse(json);
  const row = parsed.data[0] ?? { frequency: "0", reach: "0" };
  const frequency = parseFloat(row.frequency ?? "0") || 0;
  const audienceSize = parseFloat(row.reach ?? "0") || 0;

  return { frequency, audienceSize };
}

export const metaPullAdsetMetrics = createTool<typeof inputSchema, typeof outputSchema>({
  id: "meta.pullAdsetMetrics",
  description: "Pull each AdSet’s frequency & reach (audienceSize) via Meta Marketing API.",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { adSetIds, lookbackHours } = inputSchema.parse(context as unknown);

    const real = async (): Promise<MetaPullAdsetMetricsOutput> => {
      const token = process.env.META_ACCESS_TOKEN;
      if (!token) {
        throw new Error("META_ACCESS_TOKEN is not set. Provide a valid Meta access token or enable DEMO_MODE.");
      }

      const now = new Date();
      const sinceDate = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
      // Graph API time_range is date-based; collapse to YYYY-MM-DD
      const since = ymd(sinceDate);
      const until = ymd(now);

      const out: MetaPullAdsetMetricsOutput = [];
      for (const adSetId of adSetIds) {
        try {
          const { frequency, audienceSize } = await fetchAdsetInsights({
            adSetId,
            since,
            until,
            accessToken: token,
          });
          out.push({ adSetId, frequency, audienceSize });
        } catch (e) {
          // Keep pipeline resilient per-adset
          out.push({ adSetId, frequency: 0, audienceSize: 0 });
        }
      }
      return out;
    };

    const fake = async (): Promise<MetaPullAdsetMetricsOutput> => {
      // Synthetic but plausible: freq 2–9, audience 20k–250k,
      // with occasional “fatigue” (freq > 6 or audience < 50k).
      return adSetIds.map((adSetId, i) => {
        const base = rand(); // seeded in utils for determinism
        const frequency = Number((2 + base * 7).toFixed(2));              // 2–9
        const audienceSize = Math.round(20000 + base * 230000);           // 20k–250k
        // small nudge so some IDs cross thresholds:
        const nudge = (i % 3 === 0) ? 1.8 : 0.9;
        return {
          adSetId,
          frequency: Number((frequency * nudge).toFixed(2)),
          audienceSize: Math.max(0, Math.round(audienceSize / nudge)),
        };
      });
    };

    return withDemo(real, fake);
  },
});

export default metaPullAdsetMetrics;
