import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { BigQuery } from "@google-cloud/bigquery";

/**
 * Inputs: the DV360 line item ID that was patched, plus old/new CPM values.
 */
export const inputSchema = z.object({
  lineItemId: z.string(),
  oldMicros:  z.number(),
  newMicros:  z.number(),
});
export type LogDealPatchInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  success: z.boolean(),
});
export type LogDealPatchOutput = z.infer<typeof outputSchema>;

/**
 * Lazily create a BigQuery client so env is already loaded when used.
 * Throws a clear error if GOOGLE_APPLICATION_CREDENTIALS is not configured.
 */
let bq: BigQuery | null = null;
function getBigQuery(): BigQuery {
  if (!bq) {
    // Google client libraries support ADC; allow either ADC or explicit path.
    // Surface a clear message if neither service account nor workload identity is configured.
    const credHint =
      "Ensure Application Default Credentials are available (e.g. set GOOGLE_APPLICATION_CREDENTIALS to a service account key, or run `gcloud auth application-default login`, or use Workload Identity on GCP).";
    try {
      bq = new BigQuery();
    } catch (err) {
      throw new Error(`Failed to initialize BigQuery client. ${credHint} Original error: ${(err as Error).message}`);
    }
  }
  return bq;
}

/**
 * Table where we log each patch:
 * e.g. dataset `dv360_logs`, table `deal_patch_history`
 */
const DATASET_ID = process.env.BQ_DATASET_ID;
const TABLE_ID   = process.env.BQ_TABLE_ID;

export const bigqueryLogDealPatch = createTool({
  id:          "bigquery.logDealPatch",
  description: "Append a row to BigQuery with DV360 patch details for OPE analysis.",
  inputSchema,
  outputSchema,

  async execute({ context }) {
    const { lineItemId, oldMicros, newMicros } = context as LogDealPatchInput;

    // Validate input early
    if (!lineItemId || typeof oldMicros !== "number" || typeof newMicros !== "number") {
      throw new Error("Invalid input for bigquery.logDealPatch: expected { lineItemId: string, oldMicros: number, newMicros: number }");
    }

    // Validate required env vars
    if (!DATASET_ID) {
      throw new Error("BQ_DATASET_ID is not set. Please set it in the environment (.env) before running this tool.");
    }
    if (!TABLE_ID) {
      throw new Error("BQ_TABLE_ID is not set. Please set it in the environment (.env) before running this tool.");
    }

    const timestamp = new Date().toISOString();

    // Prepare the row to insert
    const row = {
      line_item_id:   lineItemId,
      timestamp,                    // ISO string
      old_amount_micros: oldMicros,
      new_amount_micros: newMicros,
      delta_micros:      newMicros - oldMicros,
    };

    // Insert into BigQuery with clear error handling
    try {
      const client = getBigQuery();
      await client
        .dataset(DATASET_ID)
        .table(TABLE_ID)
        .insert([row], { ignoreUnknownValues: false });

      return { success: true };
    } catch (err) {
      // Surface BigQuery partial failure details if available
      const e = err as any;
      const bqErrors = Array.isArray(e?.errors) ? JSON.stringify(e.errors) : "";
      const message = e?.message || String(e);
      throw new Error(`Failed to insert deal patch log row into BigQuery dataset=${DATASET_ID} table=${TABLE_ID}. ${message} ${bqErrors}`);
    }
  },
});

export default bigqueryLogDealPatch;
