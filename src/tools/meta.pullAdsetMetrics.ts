import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { withDemo, rand } from "@/utils";
import { loadFixture, listFixtureNames } from "@/fixtures/registry";

/**
 * Input: list of Ad Set IDs to fetch metrics for.
 * Output: frequency and reach (used as audienceSize) per Ad Set.
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

/* ────────────────────────────────────────────────────────────
   Real Graph API call for a single ad set
   ──────────────────────────────────────────────────────────── */
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

  const res = await fetch(`${base}?${search}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Meta insights request failed (${res.status}): ${txt}`);
  }
  const json = (await res.json()) as any;
  const row = Array.isArray(json?.data) && json.data[0] ? json.data[0] : { frequency: "0", reach: "0" };

  return {
    frequency: Number(row.frequency ?? 0) || 0,
    audienceSize: Number(row.reach ?? 0) || 0,
  };
}

/* ────────────────────────────────────────────────────────────
   Tool
   ──────────────────────────────────────────────────────────── */
export const metaPullAdsetMetrics = createTool<typeof inputSchema, typeof outputSchema>({
  id: "meta.pullAdsetMetrics",
  description: "Pull each AdSet’s frequency & reach (audienceSize) via Meta Marketing API.",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { adSetIds } = inputSchema.parse(context as unknown);

    // --- REAL path (Graph API) ---
    const real = async (): Promise<MetaPullAdsetMetricsOutput> => {
      const token = process.env.META_ACCESS_TOKEN;
      if (!token) {
        throw new Error("META_ACCESS_TOKEN is not set. Provide a valid token or enable DEMO_MODE.");
      }

      const now = new Date();
      const since = new Date(now.getTime() - 1000 * 60 * 60).toISOString().slice(0, 10);
      const until = now.toISOString().slice(0, 10);

      const out: MetaPullAdsetMetricsOutput = [];
      for (const adSetId of adSetIds) {
        try {
          const { frequency, audienceSize } = await fetchAdsetInsights({ adSetId, since, until, accessToken: token });
          out.push({ adSetId, frequency, audienceSize });
        } catch {
          // keep tool robust: zeros on per-id failure
          out.push({ adSetId, frequency: 0, audienceSize: 0 });
        }
      }
      return outputSchema.parse(out);
    };

    // --- DEMO path (fixtures or synthetic) ---
    const fake = async (): Promise<MetaPullAdsetMetricsOutput> => {
      try {
        const variants = await listFixtureNames("meta.pullAdsetMetrics");
        const variant = variants[0] ?? "baseline";
        const data = await loadFixture(
          "meta.pullAdsetMetrics",
          variant
        ) as Array<{ adSetId?: string; frequency: number; audienceSize: number }> | Record<string, { frequency: number; audienceSize: number }>;

        // Support both array and object-map fixtures
        const map: Record<string, { frequency: number; audienceSize: number }> = Array.isArray(data)
          ? Object.fromEntries(data.map((r, i) => [r.adSetId ?? `fixture-${i}`, { frequency: r.frequency, audienceSize: r.audienceSize }]))
          : data;

        return outputSchema.parse(
          adSetIds.map((id) => {
            const m = map[id] ?? null;
            return {
              adSetId: id,
              frequency: m?.frequency ?? Number((1 + rand() * 8).toFixed(2)),   // ~1–9
              audienceSize: m?.audienceSize ?? Math.floor(30000 + rand() * 170000), // 30k–200k
            };
          })
        );
      } catch {
        // Fully synthetic fallback
        return outputSchema.parse(
          adSetIds.map((id) => ({
            adSetId: id,
            frequency: Number((1 + rand() * 8).toFixed(2)),
            audienceSize: Math.floor(30000 + rand() * 170000),
          }))
        );
      }
    };

    return withDemo(real, fake);
  },
});

export default metaPullAdsetMetrics;
