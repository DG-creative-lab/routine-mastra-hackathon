import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { BigQuery, TableMetadata } from "@google-cloud/bigquery";
import crypto from "node:crypto";
import { withDemo } from "@/utils";
import fs from "fs/promises";
import path from "path";

/* ────────────────────────────────────────────────────────────
   Env
   ──────────────────────────────────────────────────────────── */
const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID;              // optional if GOOGLE_APPLICATION_CREDENTIALS provides it
const BQ_DATASET    = process.env.BQ_DATASET    ?? "mastra_logs";
const BQ_TABLE_LAL  = process.env.BQ_TABLE_LAL  ?? "amc_lookalike_builds";
const BQ_LOCATION   = process.env.BQ_LOCATION;                // e.g., "US", "EU"

/* ────────────────────────────────────────────────────────────
   Schemas
   ──────────────────────────────────────────────────────────── */
export const inputSchema = z.object({
  audienceId:    z.string().min(1),
  seedCount:     z.number().int().nonnegative(),
  lookalikeSize: z.number().int().positive().optional(),
  source:        z.string().default("amc"),
  status:        z.enum(["created", "exported", "failed"]).default("created"),
  advertiserId:  z.string().optional(),
  campaignId:    z.string().optional(),
  meta:          z.record(z.any()).optional(),
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
const bq = new BigQuery({ projectId: BQ_PROJECT_ID, location: BQ_LOCATION });

async function ensureTable() {
  const dataset = bq.dataset(BQ_DATASET);
  const [dsExists] = await dataset.exists();
  if (!dsExists) await dataset.create();

  const table = dataset.table(BQ_TABLE_LAL);
  const [tblExists] = await table.exists();
  if (!tblExists) {
    const schema: TableMetadata["schema"] = {
      fields: [
        { name: "insertId",      type: "STRING",    mode: "REQUIRED" },
        { name: "timestamp",     type: "TIMESTAMP", mode: "REQUIRED" },
        { name: "audienceId",    type: "STRING",    mode: "REQUIRED" },
        { name: "seedCount",     type: "INTEGER",   mode: "REQUIRED" },
        { name: "lookalikeSize", type: "INTEGER",   mode: "NULLABLE" },
        { name: "source",        type: "STRING",    mode: "REQUIRED" },
        { name: "status",        type: "STRING",    mode: "REQUIRED" },
        { name: "advertiserId",  type: "STRING",    mode: "NULLABLE" },
        { name: "campaignId",    type: "STRING",    mode: "NULLABLE" },
        { name: "meta",          type: "JSON",      mode: "NULLABLE" },
      ],
    };
    await table.create({ schema });
  }
}

/* ────────────────────────────────────────────────────────────
   Tool
   ──────────────────────────────────────────────────────────── */
export const bigqueryLookAlikeBuild = createTool<typeof inputSchema, typeof outputSchema>({
  id: "bigquery.lookAlikeBuild",
  description: "Append a row to BigQuery for each AMC look-alike build (audit trail & analytics).",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const {
      audienceId, seedCount, lookalikeSize, source, status,
      advertiserId, campaignId, meta, dryRun,
    } = inputSchema.parse(context as unknown);

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

    const real = async () => {
      if (!dryRun) {
        await ensureTable();
        await bq
          .dataset(BQ_DATASET)
          .table(BQ_TABLE_LAL)
          .insert([{ insertId, json: row } as any], { ignoreUnknownValues: false });
      }
      return outputSchema.parse({
        table: `${BQ_PROJECT_ID ?? "(default)"}.${BQ_DATASET}.${BQ_TABLE_LAL}`,
        insertId,
        row,
      });
    };

    const fake = async () => {
      const dir = path.resolve(process.cwd(), ".runs", "demo-logs");
      await fs.mkdir(dir, { recursive: true });
      await fs.appendFile(path.join(dir, "amc_lookalike_builds.ndjson"), JSON.stringify(row) + "\n");
      return outputSchema.parse({
        table: `${BQ_PROJECT_ID ?? "(default)"}.${BQ_DATASET}.${BQ_TABLE_LAL}`,
        insertId,
        row,
      });
    };

    return withDemo(real, fake);
  },
});

export default bigqueryLookAlikeBuild;