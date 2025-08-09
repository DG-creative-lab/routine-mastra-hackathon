import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { BigQuery } from "@google-cloud/bigquery";
import { withDemo } from "@/utils";
import fs from "fs/promises";
import path from "path";

/** Inputs: DV360 line item + old/new CPM micros */
export const inputSchema = z.object({
  lineItemId: z.string(),
  oldMicros:  z.number(),
  newMicros:  z.number(),
});
export type LogDealPatchInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({ success: z.boolean() });
export type LogDealPatchOutput = z.infer<typeof outputSchema>;

let bq: BigQuery | null = null;
function getBigQuery(): BigQuery {
  if (!bq) {
    try { bq = new BigQuery(); }
    catch (err) {
      const msg =
        "Ensure ADC is configured (GOOGLE_APPLICATION_CREDENTIALS, `gcloud auth application-default login`, or Workload Identity).";
      throw new Error(`Failed to initialize BigQuery client. ${msg} ${(err as Error).message}`);
    }
  }
  return bq;
}

const DATASET_ID = process.env.BQ_DATASET_ID;
const TABLE_ID   = process.env.BQ_TABLE_ID;

export const bigqueryLogDealPatch = createTool<typeof inputSchema, typeof outputSchema>({
  id: "bigquery.logDealPatch",
  description: "Append a row to BigQuery with DV360 patch details for OPE analysis.",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { lineItemId, oldMicros, newMicros } = inputSchema.parse(context as unknown);

    const real = async (): Promise<LogDealPatchOutput> => {
      if (!DATASET_ID) throw new Error("BQ_DATASET_ID is not set.");
      if (!TABLE_ID)   throw new Error("BQ_TABLE_ID is not set.");

      const row = {
        line_item_id:       lineItemId,
        timestamp:          new Date().toISOString(),
        old_amount_micros:  oldMicros,
        new_amount_micros:  newMicros,
        delta_micros:       newMicros - oldMicros,
      };

      try {
        await getBigQuery().dataset(DATASET_ID).table(TABLE_ID)
          .insert([row], { ignoreUnknownValues: false });
        return outputSchema.parse({ success: true });
      } catch (err: any) {
        const details = Array.isArray(err?.errors) ? JSON.stringify(err.errors) : "";
        throw new Error(`BigQuery insert failed (${DATASET_ID}.${TABLE_ID}). ${err?.message ?? err} ${details}`);
      }
    };

    const fake = async (): Promise<LogDealPatchOutput> => {
      const dir = path.resolve(process.cwd(), ".runs", "demo-logs");
      await fs.mkdir(dir, { recursive: true });
      const row = {
        line_item_id:       lineItemId,
        timestamp:          new Date().toISOString(),
        old_amount_micros:  oldMicros,
        new_amount_micros:  newMicros,
        delta_micros:       newMicros - oldMicros,
      };
      await fs.appendFile(path.join(dir, "dv360_deal_patches.ndjson"), JSON.stringify(row) + "\n");
      return outputSchema.parse({ success: true });
    };

    return withDemo(real, fake);
  },
});

export default bigqueryLogDealPatch;
