import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Inputs: 
 *  - skus: list of seed SKUs
 *  - lookbackDays: how many days back to query (default 30)
 */
export const inputSchema = z.object({
  skus: z.array(z.string()).nonempty(),
  lookbackDays: z.number().int().min(1).max(90).default(30),
});
export type AmcFetchPurchasersInput = z.infer<typeof inputSchema>;

/**
 * Outputs:
 *  - sku: the seed SKU
 *  - purchaserIds: array of purchaser identifiers (e.g. shopper IDs)
 */
export const outputSchema = z.array(
  z.object({
    sku: z.string(),
    purchaserIds: z.array(z.string()),
  })
);
export type AmcFetchPurchasersOutput = z.infer<typeof outputSchema>;

/**
 * Environment variables:
 *  AMC_API_ENDPOINT=https://api.your-amc.com
 *  AMC_API_KEY=...
 */
const AMC_ENDPOINT = process.env.AMC_API_ENDPOINT!;
const AMC_API_KEY  = process.env.AMC_API_KEY!;

export const amcFetchPurchasers = createTool({
  id:          "amc.fetchPurchasers",
  description: "Fetch last N-day purchaser IDs for each SKU from AMC.",
  inputSchema,
  outputSchema,

  async execute({ context }) {
    const { skus, lookbackDays } = inputSchema.parse(context as any);

    if (!AMC_ENDPOINT || !AMC_API_KEY) {
      throw new Error(
        "AMC_API_ENDPOINT or AMC_API_KEY not set in env – unable to query AMC."
      );
    }

    const results: AmcFetchPurchasersOutput = [];

    // Query each SKU in turn (could be parallelized)
    for (const sku of skus) {
      try {
        const url = new URL(`${AMC_ENDPOINT}/purchasers`);
        url.searchParams.set("sku", sku);
        url.searchParams.set("days", String(lookbackDays));

        const res = await fetch(url.toString(), {
          headers: {
            "Authorization": `Bearer ${AMC_API_KEY}`,
            "Accept":        "application/json",
          },
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`AMC error ${res.status}: ${body}`);
        }

        const json = await res.json() as { purchasers: string[] };
        results.push({
          sku,
          purchaserIds: Array.isArray(json.purchasers) ? json.purchasers : [],
        });
      } catch (e) {
        // on error, push empty list so downstream steps still run
        console.warn(`amc.fetchPurchasers failed for SKU=${sku}:`, e);
        results.push({ sku, purchaserIds: [] });
      }
    }

    return results;
  },
});

export default amcFetchPurchasers;
