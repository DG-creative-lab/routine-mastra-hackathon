import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { displayvideo_v1 } from "@googleapis/displayvideo";
import { GoogleAuth } from "google-auth-library";

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

// auth + client
const auth = new GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS!,
  scopes:  ["https://www.googleapis.com/auth/display-video"],
});
const dv360 = new displayvideo_v1.Displayvideo({ auth });
const ADVERTISER_ID = process.env.DV360_ADVERTISER_ID!;

export const dv360PatchDealBid = createTool({
  id:          "dv360.patchDealBid",
  description: "Adjust a DV360 line item's fixed CPM by the given percent.",
  inputSchema,
  outputSchema,

  async execute({ context }) {
    const { dealId, percent } = context as Dv360PatchDealBidInput;
    // Map external "dealId" to actual lineItemId for DV360 API
    const lineItemId = dealId;

    // 1) Fetch existing line item:
    const getRes = await dv360.advertisers.lineItems.get({
      advertiserId: String(ADVERTISER_ID),
      lineItemId: String(lineItemId),
    });
    const lineItem = getRes.data;

    // Determine current fixed CPM micros from supported structure in v1 types (bidStrategy.fixedBid)
    const currentMicros = lineItem.bidStrategy?.fixedBid?.bidAmountMicros ?? null;

    if (currentMicros == null) {
      throw new Error(
        `Line item ${lineItemId} has no fixed CPM fixedBid (bidStrategy.fixedBid.bidAmountMicros not set)`
      );
    }
    const oldMicros = Number(currentMicros);

    // 2) Compute new CPM:
    const newMicros = Math.round(oldMicros * (1 + percent / 100));

    // 3) Patch updated CPM back (updateMask must be a comma-separated string for fields on the LineItem)
    await dv360.advertisers.lineItems.patch({
      advertiserId: String(ADVERTISER_ID),
      lineItemId: String(lineItemId),
      updateMask: "bidStrategy.fixedBid.bidAmountMicros",
      requestBody: {
        bidStrategy: {
          ...lineItem.bidStrategy,
          fixedBid: {
            ...lineItem.bidStrategy?.fixedBid,
            // DV360 int64 fields are typed as string in the client types
            bidAmountMicros: String(newMicros),
          },
        },
      },
    });

    return { oldMicros, newMicros };
  },
});

export default dv360PatchDealBid;
