import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { BigQuery, TableMetadata } from "@google-cloud/bigquery";
import crypto from "node:crypto";

/* ────────────────────────────────────────────────────────────
   Env
   ──────────────────────────────────────────────────────────── */
const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID;              // optional if GOOGLE_APPLICATION_CREDENTIALS has it
const BQ_DATASET    = process.env.BQ_DATASET    ?? "mastra_logs";
const BQ_TABLE_LAL  = process.env.BQ_TABLE_LAL  ?? "amc_lookalike_builds";
// Optional: BQ_LOCATION (e.g., "US", "EU")
const BQ_LOCATION   = process.env.BQ_LOCATION;

/* ────────────────────────────────────────────────────────────
   Schemas
   ──────────────────────────────────────────────────────────── */
export const inputSchema = z.object({
  audienceId:    z.string().min(1),
  seedCount:     z.number().int().nonnegative(),
  lookalikeSize: z.number().int().positive().optional(), // e.g., 2x, 5x
  source:        z.string().default("amc"),               // where it was built (AMC)
  status:        z.enum(["created", "exported", "failed"]).default("created"),
  advertiserId:  z.string().optional(),
  campaignId:    z.string().optional(),
  meta:          z.record(z.any()).optional(),            // free-form details (SKU list, cohort, notes...)
  dryRun:        z.boolean().default(false),
});
export type LookAlikeLogInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  table:    z.string(),
  insertId: z.string(),
  row:      z.record(z.any()),
});
export type LookAlikeLogOutput = z.infer<typeof outputSchema>;

/* ────────────────────────────────────────────────────────────
   BQ Client & helpers
   ──────────────────────────────────────────────────────────── */
const bq = new BigQuery({
  projectId: BQ_PROJECT_ID,
  location: BQ_LOCATION,
});

async function ensureTable() {
  const dataset = bq.dataset(BQ_DATASET);
  const [dsExists] = await dataset.exists();
  if (!dsExists) {
    await dataset.create();
  }

  const table = dataset.table(BQ_TABLE_LAL);
  const [tblExists] = await table.exists();
  if (!tblExists) {
    const schema: TableMetadata["schema"] = {
      fields: [
        { name: "insertId",      type: "STRING", mode: "REQUIRED" },
        { name: "timestamp",     type: "TIMESTAMP", mode: "REQUIRED" },
        { name: "audienceId",    type: "STRING", mode: "REQUIRED" },
        { name: "seedCount",     type: "INTEGER", mode: "REQUIRED" },
        { name: "lookalikeSize", type: "INTEGER", mode: "NULLABLE" },
        { name: "source",        type: "STRING", mode: "REQUIRED" },
        { name: "status",        type: "STRING", mode: "REQUIRED" },
        { name: "advertiserId",  type: "STRING", mode: "NULLABLE" },
        { name: "campaignId",    type: "STRING", mode: "NULLABLE" },
        { name: "meta",          type: "JSON",   mode: "NULLABLE" },
      ],
    };
    await table.create({ schema });
  }
}

/* ────────────────────────────────────────────────────────────
   Tool: bigquery.lookAlikeBuild
   ──────────────────────────────────────────────────────────── */
export const bigqueryLookAlikeBuild = createTool({
  id: "bigquery.lookAlikeBuild",
  description:
    "Append a row to BigQuery for each AMC look-alike build (audit trail & analytics).",
  inputSchema,
  outputSchema,

  async execute({ context }) {
    const {
      audienceId,
      seedCount,
      lookalikeSize,
      source,
      status,
      advertiserId,
      campaignId,
      meta,
      dryRun,
    } = inputSchema.parse(context as any);

    const insertId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const row = {
      insertId,
      timestamp,
      audienceId,
      seedCount,
      lookalikeSize: lookalikeSize ?? null,
      source,
      status,
      advertiserId: advertiserId ?? null,
      campaignId: campaignId ?? null,
      meta: meta ?? null,
    };

    if (!dryRun) {
      await ensureTable();
      const dataset = bq.dataset(BQ_DATASET);
      const table   = dataset.table(BQ_TABLE_LAL);
      // Use insertId for idempotency/de-dupe
      await table.insert([{ insertId, json: row } as any]);
    }

    return outputSchema.parse({
      table: `${BQ_PROJECT_ID ?? "(default)"}.${BQ_DATASET}.${BQ_TABLE_LAL}`,
      insertId,
      row,
    });
  },
});

export default bigqueryLookAlikeBuild;