import "server-only";
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { displayvideo_v1 } from "@googleapis/displayvideo";
import { GoogleAuth } from "google-auth-library";
import { withDemo } from "@/utils";
import { loadFixture, listFixtureNames } from "@/utils/fixtures";

/**
 * Inputs: dealId (string), percent change (e.g. -10 to lower 10%)
 * Outputs: oldMicros, newMicros
 */
export const inputSchema = z.object({
  dealId:  z.string(),
  percent: z.number().min(-100).max(100),
});
export type Dv360PatchDealBidInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  oldMicros: z.number(),
  newMicros: z.number(),
});
export type Dv360PatchDealBidOutput = z.infer<typeof outputSchema>;

/* ——— Real client (only constructed if used) ——— */
function dv360Client() {
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const advertiserId = process.env.DV360_ADVERTISER_ID;
  if (!keyFile || !advertiserId) {
    throw new Error(
      "Missing DV360 credentials. Set GOOGLE_APPLICATION_CREDENTIALS and DV360_ADVERTISER_ID (or run with DEMO_MODE=true)."
    );
  }
  const auth = new GoogleAuth({
    keyFile,
    scopes: ["https://www.googleapis.com/auth/display-video"],
  });
  const dv360 = new displayvideo_v1.Displayvideo({ auth });
  return { dv360, advertiserId };
}

export const dv360PatchDealBid = createTool<typeof inputSchema, typeof outputSchema>({
  id:          "dv360.patchDealBid",
  description: "Adjust a DV360 line item's fixed CPM by the given percent.",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { dealId, percent } = inputSchema.parse(context as unknown);

    const real = async (): Promise<Dv360PatchDealBidOutput> => {
      const { dv360, advertiserId } = dv360Client();
      const lineItemId = String(dealId);

      const getRes = await dv360.advertisers.lineItems.get({
        advertiserId,
        lineItemId,
      });
      const lineItem = getRes.data;

      const currentMicros = lineItem.bidStrategy?.fixedBid?.bidAmountMicros ?? null;
      if (currentMicros == null) {
        throw new Error(
          `Line item ${lineItemId} has no fixed CPM bidStrategy.fixedBid.bidAmountMicros`
        );
      }
      const oldMicros = Number(currentMicros);
      const candidate  = Math.round(oldMicros * (1 + percent / 100));
      const newMicros  = Math.max(candidate, 0);

      await dv360.advertisers.lineItems.patch({
        advertiserId,
        lineItemId,
        updateMask: "bidStrategy.fixedBid.bidAmountMicros",
        requestBody: {
          bidStrategy: {
            ...lineItem.bidStrategy,
            fixedBid: {
              ...lineItem.bidStrategy?.fixedBid,
              bidAmountMicros: String(newMicros),
            },
          },
        },
      });

      return outputSchema.parse({ oldMicros, newMicros });
    };

    const fake = async (): Promise<Dv360PatchDealBidOutput> => {
      // Try fixture: src/fixtures/dv360.patchDealBid/*.json
      // Shape: { "oldMicros": 2500000, "newMicros": 2250000 }
      try {
        const variants = await listFixtureNames("dv360.patchDealBid");
        if (variants.length) {
          const data = (await loadFixture("dv360.patchDealBid", variants[0])) as
            | { oldMicros?: number; newMicros?: number }
            | null;

          if (data && (typeof data.oldMicros === "number" || typeof data.newMicros === "number")) {
            const oldMicros = data.oldMicros ?? 2_000_000;
            const newMicros = data.newMicros ?? Math.round(oldMicros * (1 + percent / 100));
            return outputSchema.parse({ oldMicros, newMicros });
          }
        }
      } catch { /* fallthrough */ }

      const oldMicros = 2_000_000 + Math.floor(Math.random() * 1_000_000);
      const newMicros = Math.max(Math.round(oldMicros * (1 + percent / 100)), 0);
      return outputSchema.parse({ oldMicros, newMicros });
    };

    return withDemo(real, fake);
  },
});

export default dv360PatchDealBid;
