import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { withDemo, rand } from "@/utils";
import { loadFixture, listFixtureNames } from "@/utils/fixtures";

/**
 * Inputs:
 *  - skus: list of seed SKUs
 *  - lookbackDays: days back to query (default 30)
 */
export const inputSchema = z.object({
  skus: z.array(z.string()).nonempty(),
  lookbackDays: z.number().int().min(1).max(90).default(30),
});
export type AmcFetchPurchasersInput = z.infer<typeof inputSchema>;

export const outputSchema = z.array(
  z.object({ sku: z.string(), purchaserIds: z.array(z.string()) })
);
export type AmcFetchPurchasersOutput = z.infer<typeof outputSchema>;

/** REAL env */
const AMC_ENDPOINT = process.env.AMC_API_ENDPOINT;
const AMC_API_KEY  = process.env.AMC_API_KEY;

export const amcFetchPurchasers = createTool<typeof inputSchema, typeof outputSchema>({
  id:          "amc.fetchPurchasers",
  description: "Fetch last N-day purchaser IDs for each SKU from AMC.",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { skus, lookbackDays } = inputSchema.parse(context as unknown);

    const real = async (): Promise<AmcFetchPurchasersOutput> => {
      if (!AMC_ENDPOINT || !AMC_API_KEY) {
        throw new Error("AMC_API_ENDPOINT or AMC_API_KEY missing. Set env or run with DEMO_MODE=true.");
      }

      const results: AmcFetchPurchasersOutput = [];
      for (const sku of skus) {
        try {
          const url = new URL(`${AMC_ENDPOINT.replace(/\/+$/, "")}/purchasers`);
          url.searchParams.set("sku", sku);
          url.searchParams.set("days", String(lookbackDays));

          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${AMC_API_KEY}`, Accept: "application/json" },
          });
          if (!res.ok) throw new Error(`AMC ${res.status}: ${await res.text().catch(() => "")}`);

          const json = (await res.json()) as { purchasers: string[] };
          results.push({ sku, purchaserIds: Array.isArray(json.purchasers) ? json.purchasers : [] });
        } catch (e) {
          console.warn(`amc.fetchPurchasers failed for SKU=${sku}:`, e);
          results.push({ sku, purchaserIds: [] });
        }
      }
      return outputSchema.parse(results);
    };

    const fake = async (): Promise<AmcFetchPurchasersOutput> => {
      // Try fixtures: src/fixtures/amc.fetchPurchasers/*.json
      // Shape: { "SKU123": ["u1","u2",...], "SKU456": [...] }
      try {
        const variants = await listFixtureNames("amc.fetchPurchasers");
        if (variants.length) {
          const fx = (await loadFixture("amc.fetchPurchasers", variants[0])) as Record<string, string[]>;
          return outputSchema.parse(
            skus.map((sku) => ({
              sku,
              purchaserIds: Array.isArray(fx[sku]) ? fx[sku] : [],
            }))
          );
        }
      } catch { /* fallthrough */ }

      // Synthetic fallback (deterministic-ish)
      return outputSchema.parse(
        skus.map((sku) => {
          const n = 120 + Math.floor(rand() * 401);
          const ids = Array.from({ length: n }, (_, i) => `u${i}_${Math.floor(rand() * 1e9)}`);
          return { sku, purchaserIds: ids };
        })
      );
    };

    return withDemo(real, fake);
  },
});

export default amcFetchPurchasers;