// src/tools/amc.createLookAlike.ts
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { withDemo, rand } from "@/utils";

/**
 * amc.createLookAlike
 * ------------------------------------------------------------
 * Creates a look-alike audience from a seed list.
 * - REAL mode: calls AMC Audience API (URL + token required)
 * - DEMO mode: returns a plausible synthetic audienceId/status
 *
 * Env (see .env.example):
 *   AMC_AUDIENCE_API_URL=   # e.g. https://amc-api.yourorg.com/v1/audiences/lookalike
 *   AMC_API_HOST=           # optional; used if AMC_AUDIENCE_API_URL is not set, defaults to https://api.amc.amazon.com
 *   AMC_API_TOKEN=          # Bearer token for your AMC audience service (REAL mode)
 *   AMAZON_ADVERTISER_ID=   # Optional: included in payload if present
 */

// ---------- Schemas ----------
export const inputSchema = z.object({
  seedIds: z.array(z.string()).nonempty().describe("List of seed audience IDs"),
  audienceName: z.string().min(1).describe("Name for the new look-alike audience"),
  sizeMultiplier: z.number().min(1).describe("Multiplier for the look-alike size (e.g. 2 for 2×)"),
});
export type AmcCreateLookAlikeInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  audienceId: z.string().describe("The ID of the newly created look-alike audience"),
  status: z.enum(["CREATING", "READY", "FAILED"]).describe("Current status of the audience job"),
});
export type AmcCreateLookAlikeOutput = z.infer<typeof outputSchema>;

// ---------- Tool ----------
export const amcCreateLookAlike = createTool({
  id: "amc.createLookAlike",
  description: "Create a look-alike audience from seed purchasers in AMC.",
  inputSchema,
  outputSchema,

  async execute(ctx: ToolExecutionContext<typeof inputSchema>) {
    const { seedIds, audienceName, sizeMultiplier } = inputSchema.parse(ctx.context as unknown);

    const real = async () => {
      const token = process.env.AMC_API_TOKEN;
      if (!token) {
        throw new Error(
          "AMC_API_TOKEN is missing. Set it in your environment or run with DEMO_MODE=true."
        );
      }

      // Prefer a full endpoint if provided; otherwise build from host + canonical path
      const host = (process.env.AMC_API_HOST ?? "https://api.amc.amazon.com").replace(/\/$/, "");
      const url =
        process.env.AMC_AUDIENCE_API_URL ??
        `${host}/v2/audiences/lookalikes`;

      const payload: Record<string, unknown> = {
        name: audienceName,
        seeds: seedIds,
        lookalikeSizeMultiplier: sizeMultiplier,
      };
      if (process.env.AMAZON_ADVERTISER_ID) {
        payload.advertiserId = String(process.env.AMAZON_ADVERTISER_ID);
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`AMC createLookAlike failed: ${res.status} ${text}`);
      }

      const raw = (await res.json()) as Record<string, any>;
      // Normalize status → one of our enum values
      const rawStatus = String(raw.status ?? "READY").toUpperCase();
      const status: "CREATING" | "READY" | "FAILED" =
        rawStatus.includes("FAIL")
          ? "FAILED"
          : rawStatus.includes("READY")
          ? "READY"
          : "CREATING";

      return outputSchema.parse({
        audienceId: String(raw.audienceId ?? raw.id ?? `aud-${Date.now()}`),
        status,
      });
    };

    const fake = async () => {
      // deterministic-ish synthetic id & status
      const suffix = Math.floor(rand() * 1_000_000)
        .toString()
        .padStart(6, "0");
      const audienceId = `aud-${suffix}`;

      // ~80% READY, ~20% CREATING for variety
      const status: "CREATING" | "READY" | "FAILED" =
        rand() < 0.8 ? "READY" : "CREATING";

      return outputSchema.parse({ audienceId, status });
    };

    return withDemo(real, fake);
  },
});

export default amcCreateLookAlike;