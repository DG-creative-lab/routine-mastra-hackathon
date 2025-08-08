import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Input: list of Ad Set IDs to fetch metrics for.
 * Output: frequency and reach (used here as audienceSize proxy) per Ad Set.
 */
export const inputSchema = z.object({
  adSetIds: z.array(z.string()).nonempty(),
});
export type MetaPullAdsetMetricsInput = z.infer<typeof inputSchema>;

export const outputSchema = z.array(
  z.object({
    adSetId: z.string(),
    frequency: z.number(),
    audienceSize: z.number(),
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
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

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

/**
 * meta.pullAdsetMetrics
 * ————————————————————————————————————————————————————————————
 * Fetches up-to-the-hour “frequency” & “reach” for each Ad Set.
 */
export const metaPullAdsetMetrics = createTool({
  id: "meta.pullAdsetMetrics",
  description:
    "Pull each AdSet’s frequency & reach (audienceSize) via Meta Marketing API.",
  inputSchema,
  outputSchema,

  async execute({ context }) {
    const { adSetIds } = inputSchema.parse(context as any);

    const token = process.env.META_ACCESS_TOKEN;
    if (!token) {
      throw new Error(
        "META_ACCESS_TOKEN is not set. Please provide a valid Meta access token."
      );
    }

    const now = new Date();
    const since = new Date(now.getTime() - 1000 * 60 * 60)
      .toISOString()
      .slice(0, 10);
    const until = now.toISOString().slice(0, 10);

    const results: MetaPullAdsetMetricsOutput = [];

    for (const adSetId of adSetIds) {
      try {
        const { frequency, audienceSize } = await fetchAdsetInsights({
          adSetId,
          since,
          until,
          accessToken: token,
        });

        results.push({ adSetId, frequency, audienceSize });
      } catch {
        // On per-adset failure, push zeros so the tool remains robust
        results.push({ adSetId, frequency: 0, audienceSize: 0 });
      }
    }

    return results;
  },
});

export default metaPullAdsetMetrics;
