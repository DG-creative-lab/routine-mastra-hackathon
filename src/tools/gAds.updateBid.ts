import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { GoogleAdsApi } from "google-ads-api";

/**
 * Strongly type the tool's input/output using Zod and z.infer,
 * and align the execute signature with Mastra's createTool API.
 */
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

const gads = new GoogleAdsApi({
  client_id: process.env.GADS_CLIENT_ID!,
  client_secret: process.env.GADS_CLIENT_SECRET!,
  developer_token: process.env.GADS_DEV_TOKEN!,
});

// Minimal type for GAQL query row to satisfy strict TS
type BudgetRow = {
  campaign_budget?: {
    resource_name?: string;
    amount_micros?: string | number | null;
  };
};

export const gAdsUpdateBid = createTool({
  id: "gAds.updateBid",
  description: "Apply a %-based bid adjustment to a Google-Ads campaign.",

  inputSchema,
  outputSchema,

  // Mastra execute signature receives a single object with named params.
  async execute({ context }: { context: GAdsUpdateBidInput }) {
    const { campaignId, percent } = context;

    const customer = gads.Customer({
      customer_id: process.env.GADS_CUST_ID!,
      refresh_token: process.env.GADS_REFRESH!,
    });

    // 1) Query (stream) – fully typed per google-ads-api v14
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
      throw new Error(`Campaign ${campaignId} not found or has no budget`);
    }

    const budgetResName = row.campaign_budget.resource_name!;
    const oldMicros = Number(row.campaign_budget.amount_micros);
    const newMicros = Math.round(oldMicros * (1 + percent / 100));

    // 2) Patch via mutateCampaignBudgets (gRPC) with explicit updateMask
    // Correct v14 pattern: get the service from the authenticated Customer instance.
    const budgetSvc = (customer as any).getService("CampaignBudgetServiceClient");

    await budgetSvc.mutateCampaignBudgets({
      customerId: process.env.GADS_CUST_ID!,
      operations: [
        {
          update: {
            resourceName: budgetResName,
            amountMicros: BigInt(newMicros),
          } as any,
          updateMask: { paths: ["amount_micros"] },
        },
      ],
    });

    return { oldMicros, newMicros };
  },
});

export default gAdsUpdateBid;
