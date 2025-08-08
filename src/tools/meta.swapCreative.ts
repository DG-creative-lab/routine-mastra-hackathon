import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Input:
 *   - adSetId: the ID of the Meta Ad Set to update
 *   - creativeId: the ID of the new Creative to assign
 *
 * Output:
 *   - success: whether the swap succeeded
 */
export const inputSchema = z.object({
  adSetId:    z.string().nonempty(),
  creativeId: z.string().nonempty(),
});
export type MetaSwapCreativeInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  success: z.boolean(),
});
export type MetaSwapCreativeOutput = z.infer<typeof outputSchema>;

/**
 * meta.swapCreative
 * ————————————————————————————————————————————————————————————
 * Swaps in a new creative asset into an Ad Set via Meta Graph API.
 */
export const metaSwapCreative = createTool({
  id:          "meta.swapCreative",
  description: "Rotate in a new creative for the given Ad Set via Meta Marketing API.",

  inputSchema,
  outputSchema,

  async execute({ context }) {
    const { adSetId, creativeId } = inputSchema.parse(context as any);
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) {
      throw new Error(
        "META_ACCESS_TOKEN is not set. Please provide a valid Meta access token."
      );
    }

    // Meta Graph API endpoint for updating an Ad's creative field:
    // Note: In the Marketing API, you typically update the Ad (not AdSet) itself.
    // Here we assume adSetId is actually the Ad's ID. Adjust if needed.
    const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(adSetId)}`;
    const params = new URLSearchParams({
      creative: JSON.stringify({ creative_id: creativeId }),
      access_token: token,
    });

    const res = await fetch(`${url}?${params}`, {
      method: "POST",
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Meta swapCreative failed (${res.status}): ${text}`);
    }

    // Graph API returns { success: true } on success
    const json = (await res.json()) as any;
    return { success: !!json.success } as MetaSwapCreativeOutput;
  },
});

export default metaSwapCreative;
