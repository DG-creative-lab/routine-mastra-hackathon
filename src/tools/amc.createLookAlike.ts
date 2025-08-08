
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";

/**
 * amc.createLookAlike
 * ------------------------------------------------------------
 * Creates a look-alike audience from a seed list.
 * - Works against a generic AMC Audience API endpoint if configured
 * - Falls back to DRY RUN when creds/URL are missing
 *
 * Env (see .env.example):
 *   AMC_AUDIENCE_API_URL=   # e.g. https://amc-api.yourorg.com/v1/audiences/lookalike
 *   AMC_API_TOKEN=          # Bearer token for your AMC audience service
 *   AMAZON_ADVERTISER_ID=   # Optional: used in payload if your API expects it
 */


/**
 * Inputs for creating a look-alike audience in Amazon Marketing Cloud.
 */
export const inputSchema = z.object({
  seedIds:       z.array(z.string()).nonempty().describe("List of seed audience IDs"),
  audienceName:  z.string().min(1).describe("Name for the new look-alike audience"),
  sizeMultiplier: z.number().min(1).describe("Multiplier for the look-alike size (e.g. 2 for 2×)"),
});
export type AmcCreateLookAlikeInput = z.infer<typeof inputSchema>;

/**
 * Outputs returned after creating the look-alike audience.
 */
export const outputSchema = z.object({
  audienceId: z.string().describe("The ID of the newly created look-alike audience"),
  status:     z.enum(["CREATING", "READY", "FAILED"]).describe("Current status of the audience job"),
});
export type AmcCreateLookAlikeOutput = z.infer<typeof outputSchema>;

/**
 * amc.createLookAlike
 *
 * Calls AMC's audience-creation endpoint to build a look-alike audience
 * from the given seed IDs, named and sized as requested.
 */
export const amcCreateLookAlike = createTool({
  id:          "amc.createLookAlike",
  description: "Create a look-alike audience from seed purchasers in AMC.",
  inputSchema,
  outputSchema,

  async execute(ctx: ToolExecutionContext<typeof inputSchema>) {
    const { seedIds, audienceName, sizeMultiplier } = ctx.context;

    const token = process.env.AMC_API_TOKEN;
    const host  = process.env.AMC_API_HOST ?? "https://api.amc.amazon.com";
    if (!token) {
      throw new Error("AMC_API_TOKEN is missing. Please set it in your .env");
    }

    // Construct request payload
    const payload = {
      name: audienceName,
      seeds: seedIds,
      lookalikeSizeMultiplier: sizeMultiplier,
    };
    // Fire the HTTP request
    const res = await fetch(`${host}/v2/audiences/lookalikes`, {
    method:  "POST",
    headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
    },
    body: JSON.stringify(payload),
    });

    if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AMC createLookAlike failed (${res.status}): ${errText}`);
    }

    // 1) Read the raw JSON (as any)
    // 2) Parse + validate via our Zod schema
    const raw = (await res.json()) as Record<string, any>;
    const result = outputSchema.parse({
    audienceId: raw.audienceId,
    status:     raw.status,
    });

    return result;
  },
});

export default amcCreateLookAlike;