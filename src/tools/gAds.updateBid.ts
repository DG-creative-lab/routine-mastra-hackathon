import "server-only";
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { GoogleAdsApi } from "google-ads-api";
import { withDemo } from "@/utils";

/*──────────────────────────────────────────────────────────────┐
  Schemas
 └──────────────────────────────────────────────────────────────*/
export const inputSchema = z.object({
  campaignId: z.number(),
  percent: z.number().min(-100).max(100),
});
export type GAdsUpdateBidInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  oldMicros: z.number(),
  newMicros: z.number(),
});
export type GAdsUpdateBidOutput = z.infer<typeof outputSchema>;

/*──────────────────────────────────────────────────────────────┐
  Client bootstrap
 └──────────────────────────────────────────────────────────────*/
const GADS_CLIENT_ID     = process.env.GADS_CLIENT_ID ?? "";
const GADS_CLIENT_SECRET = process.env.GADS_CLIENT_SECRET ?? "";
const GADS_DEV_TOKEN     = process.env.GADS_DEV_TOKEN ?? "";
const GADS_CUST_ID       = process.env.GADS_CUST_ID ?? "";
const GADS_REFRESH       = process.env.GADS_REFRESH ?? "";

function assertEnv() {
  const miss: string[] = [];
  if (!GADS_CLIENT_ID)     miss.push("GADS_CLIENT_ID");
  if (!GADS_CLIENT_SECRET) miss.push("GADS_CLIENT_SECRET");
  if (!GADS_DEV_TOKEN)     miss.push("GADS_DEV_TOKEN");
  if (!GADS_CUST_ID)       miss.push("GADS_CUST_ID");
  if (!GADS_REFRESH)       miss.push("GADS_REFRESH");
  if (miss.length) {
    throw new Error(`Missing Google Ads env: ${miss.join(", ")}. Set them or enable DEMO_MODE.`);
  }
}

const gads = new GoogleAdsApi({
  client_id:     GADS_CLIENT_ID,
  client_secret: GADS_CLIENT_SECRET,
  developer_token: GADS_DEV_TOKEN,
});

// Minimal GAQL row shape
type BudgetRow = {
  campaign_budget?: {
    resource_name?: string;
    amount_micros?: string | number | null;
  };
};

export const gAdsUpdateBid = createTool<typeof inputSchema, typeof outputSchema>({
  id: "gAds.updateBid",
  description: "Apply a %-based bid/budget adjustment to a Google Ads campaign.",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { campaignId, percent } = inputSchema.parse(context as unknown);

    const real = async (): Promise<GAdsUpdateBidOutput> => {
      assertEnv();

      const customer = gads.Customer({
        customer_id:  GADS_CUST_ID,
        refresh_token: GADS_REFRESH,
      });

      // 1) Query the campaign budget (single row)
      const stream = customer.queryStream<BudgetRow>(`
        SELECT campaign_budget.resource_name,
               campaign_budget.amount_micros
        FROM   campaign
        WHERE  campaign.id = ${campaignId}
        LIMIT  1
      `);

      let row: BudgetRow | undefined;
      for await (const r of stream) { row = r; break; }

      if (!row?.campaign_budget?.resource_name || row.campaign_budget.amount_micros == null) {
        throw new Error(`Campaign ${campaignId} not found or has no budget.`);
      }

      const budgetResName = String(row.campaign_budget.resource_name);
      const oldMicros     = Number(row.campaign_budget.amount_micros);
      const newMicros     = Math.round(oldMicros * (1 + percent / 100));

      // 2) Mutate – update mask must target amount_micros
      // Using raw service to avoid dependency on versioned helpers
      const svc: any = (customer as any).getService("CampaignBudgetServiceClient");
      await svc.mutateCampaignBudgets({
        customerId: GADS_CUST_ID,
        operations: [
          {
            update: {
              resourceName: budgetResName,
              // google-ads expects int64 as string or BigInt; this client accepts BigInt
              amountMicros: BigInt(newMicros),
            },
            updateMask: { paths: ["amount_micros"] },
          },
        ],
      });

      return outputSchema.parse({ oldMicros, newMicros });
    };

    const fake = async (): Promise<GAdsUpdateBidOutput> => {
      // Choose a consistent fake baseline and apply percent
      const oldMicros = 2_000_000; // $2.00
      const newMicros = Math.round(oldMicros * (1 + percent / 100));
      return outputSchema.parse({ oldMicros, newMicros });
    };

    return withDemo(real, fake);
  },
});

export default gAdsUpdateBid;
