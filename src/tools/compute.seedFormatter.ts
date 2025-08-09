import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import crypto from "node:crypto";

/**
 * compute.seedFormatter
 * ------------------------------------------------------------
 * Normalizes purchaser rows into an AMC-ready seed list.
 * - Default: hashed emails (SHA-256, lowercase, trimmed)
 * - Optional: deviceId or userId seeds
 * - Dedupe, top-N by revenue/quantity, minimum-seed stats
 */

// Input rows you’ll pass from amc.fetchPurchasers (or your own source)
const PurchaserRow = z.object({
  email:       z.string().email().optional(),
  hashedEmail: z.string().regex(/^[a-f0-9]{64}$/).optional(), // pre-hashed OK (lowercase hex)
  deviceId:    z.string().optional(), // IDFA/AAID/etc. (we’ll normalize)
  userId:      z.string().optional(), // your internal CRM id
  sku:         z.string().optional(),
  quantity:    z.number().optional(),
  revenue:     z.number().optional(), // used for top-N ranking if requested
});

// Tool input schema
export const inputSchema = z.object({
  purchasers: z.array(PurchaserRow).nonempty(),

  // Which field to use as seed identifier
  idField: z.enum(["hashedEmail", "email", "deviceId", "userId"]).default("hashedEmail"),

  // If idField=email and you want us to hash it (recommended)
  hashEmails: z.boolean().default(true),

  // Post-processing knobs
  dedupe: z.boolean().default(true),
  minSeed: z.number().int().min(1).max(100_000).default(100),

  // Optionally rank and keep only topN by one of these metrics
  takeTopBy: z.enum(["revenue", "quantity"]).optional(),
  topN: z.number().int().min(1).optional(),
});
export type AmcSeedFormatterInput = z.infer<typeof inputSchema>;

// Tool output schema
export const outputSchema = z.object({
  seedIds: z.array(z.string()),
  count: z.number(),
  stats: z.object({
    totalRows: z.number(),
    deduped: z.number(),
    fieldUsed: z.string(),
    belowMinSeed: z.boolean(),
    droppedForMissingId: z.number(),
    tookTopN: z.number().nullable(),
    hashedCount: z.number(), // how many emails we hashed in this run
  }),
  preview: z.array(z.string()).max(10),
});
export type AmcSeedFormatterOutput = z.infer<typeof outputSchema>;

/* Helpers */
const sha256Hex = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex");

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Normalize IDFA/AAID-ish device IDs: remove non-hex, lowercase */
const normalizeDeviceId = (id: string) =>
  id.replace(/[^A-Fa-f0-9]/g, "").toLowerCase();

/** Pull the “ranking metric” we might sort by (default 0) */
function metricOf(row: z.infer<typeof PurchaserRow>, key?: "revenue" | "quantity"): number {
  if (!key) return 0;
  return Number(row[key] ?? 0) || 0;
}

/** Extract a seed string from a row, based on idField & options */
function extractSeed(
  row: z.infer<typeof PurchaserRow>,
  idField: AmcSeedFormatterInput["idField"],
  hashEmails: boolean,
  counters: { hashedCount: number }
): string | null {
  switch (idField) {
    case "hashedEmail": {
      if (row.hashedEmail) return row.hashedEmail.toLowerCase();
      if (row.email && hashEmails) {
        counters.hashedCount += 1;
        return sha256Hex(normalizeEmail(row.email));
      }
      return null;
    }
    case "email": {
      if (!row.email) return null;
      return normalizeEmail(row.email);
    }
    case "deviceId": {
      if (!row.deviceId) return null;
      return normalizeDeviceId(row.deviceId);
    }
    case "userId": {
      if (!row.userId) return null;
      return String(row.userId);
    }
    default:
      return null;
  }
}

export const amcSeedFormatter = createTool<typeof inputSchema, typeof outputSchema>({
  id: "amc.seedFormatter",
  description:
    "Normalize purchaser rows into a deduped seed list for AMC look-alike creation (hashed email/device/userId).",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const {
      purchasers,
      idField,
      hashEmails,
      dedupe,
      minSeed,
      takeTopBy,
      topN,
    } = inputSchema.parse(context as unknown);

    if (!Array.isArray(purchasers) || purchasers.length === 0) {
      throw new Error("amc.seedFormatter: purchasers[] is empty");
    }

    // Optional: rank by metric and keep topN
    let rows = purchasers.slice();
    let tookTopN: number | null = null;
    if (takeTopBy && topN) {
      rows = rows
        .slice()
        .sort((a, b) => metricOf(b, takeTopBy) - metricOf(a, takeTopBy))
        .slice(0, topN);
      tookTopN = Math.min(topN, purchasers.length);
    }

    const counters = { hashedCount: 0, droppedForMissingId: 0 };

    const seen = new Set<string>();
    const seedIdsOrdered: string[] = [];

    for (const row of rows) {
      const seed = extractSeed(row, idField, hashEmails, counters);
      if (!seed) {
        counters.droppedForMissingId++;
        continue;
      }
      if (dedupe) {
        if (!seen.has(seed)) {
          seen.add(seed);
          seedIdsOrdered.push(seed);
        }
      } else {
        seedIdsOrdered.push(seed);
      }
    }

    const belowMinSeed = seedIdsOrdered.length < minSeed;
    const deduped =
      dedupe ? (rows.length - seedIdsOrdered.length) : 0;

    return outputSchema.parse({
      seedIds: seedIdsOrdered,
      count: seedIdsOrdered.length,
      stats: {
        totalRows: purchasers.length,
        deduped,
        fieldUsed: idField,
        belowMinSeed,
        droppedForMissingId: counters.droppedForMissingId,
        tookTopN,
        hashedCount: counters.hashedCount,
      },
      preview: seedIdsOrdered.slice(0, 10),
    });
  },
});

export default amcSeedFormatter;