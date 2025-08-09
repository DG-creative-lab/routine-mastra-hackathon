import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { displayvideo_v1 } from "@googleapis/displayvideo";
import { GoogleAuth } from "google-auth-library";
import { withDemo } from "@/utils";
import fs from "fs/promises";
import path from "path";

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

      // In many teams "dealId" is an internal handle; map it if needed.
      const lineItemId = String(dealId);

      // 1) Fetch existing line item:
      const getRes = await dv360.advertisers.lineItems.get({
        advertiserId,
        lineItemId,
      });
      const lineItem = getRes.data;

      // 2) Pull current fixed CPM micros
      const currentMicros = lineItem.bidStrategy?.fixedBid?.bidAmountMicros ?? null;
      if (currentMicros == null) {
        throw new Error(
          `Line item ${lineItemId} has no fixed CPM bidStrategy.fixedBid.bidAmountMicros`
        );
      }
      const oldMicros = Number(currentMicros);

      // 3) Compute new CPM; guard negative/zero
      const candidate = Math.round(oldMicros * (1 + percent / 100));
      const newMicros = Math.max(candidate, 0);

      // 4) Patch updated CPM (updateMask must target the int64 field)
      await dv360.advertisers.lineItems.patch({
        advertiserId,
        lineItemId,
        updateMask: "bidStrategy.fixedBid.bidAmountMicros",
        requestBody: {
          bidStrategy: {
            ...lineItem.bidStrategy,
            fixedBid: {
              ...lineItem.bidStrategy?.fixedBid,
              bidAmountMicros: String(newMicros), // int64 field expects string
            },
          },
        },
      });

      return outputSchema.parse({ oldMicros, newMicros });
    };

    const fake = async (): Promise<Dv360PatchDealBidOutput> => {
      // Synthesize a plausible old/new micros value and log it locally
      const base = 2_000_000 + Math.floor(Math.random() * 1_000_000); // $2.00–$3.00 CPM
      const oldMicros = base;
      const newMicros = Math.max(Math.round(base * (1 + percent / 100)), 0);

      const dir = path.resolve(process.cwd(), ".runs", "demo-logs");
      await fs.mkdir(dir, { recursive: true });
      const fp = path.join(dir, "dv360_patch_bid.ndjson");
      await fs.appendFile(
        fp,
        JSON.stringify({
          ts: new Date().toISOString(),
          dealId,
          percent,
          oldMicros,
          newMicros,
        }) + "\n"
      );

      return outputSchema.parse({ oldMicros, newMicros });
    };

    return withDemo(real, fake);
  },
});

export default dv360PatchDealBid;
