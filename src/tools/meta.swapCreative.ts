import "server-only";
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { withDemo } from "@/utils";
import { loadFixture, listFixtureNames } from "@/utils/fixtures";

/**
 * Env:
 *   META_ACCESS_TOKEN=  // Marketing API token with ads_management
 */

export const inputSchema = z.object({
  /** NOTE: treated as an Ad ID for the Graph API call. */
  adSetId:    z.string().nonempty(),
  creativeId: z.string().nonempty(),
});
export type MetaSwapCreativeInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  success: z.boolean(),
});
export type MetaSwapCreativeOutput = z.infer<typeof outputSchema>;

export const metaSwapCreative = createTool<typeof inputSchema, typeof outputSchema>({
  id: "meta.swapCreative",
  description: "Rotate in a new creative for the given Ad (plan calls it AdSet) via Meta Marketing API.",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { adSetId, creativeId } = inputSchema.parse(context as unknown);

    const real = async (): Promise<MetaSwapCreativeOutput> => {
      const token = process.env.META_ACCESS_TOKEN;
      if (!token) {
        throw new Error("META_ACCESS_TOKEN is not set. Provide a valid token or enable DEMO_MODE.");
      }

      // Treat adSetId as Ad ID here:
      const adId = adSetId;
      const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(adId)}`;
      const params = new URLSearchParams({
        creative: JSON.stringify({ creative_id: creativeId }),
        access_token: token,
      });

      const res = await fetch(`${url}?${params}`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Meta swapCreative failed (${res.status}): ${text}`);
      }

      const json = (await res.json()) as any; // { success: true } on success
      return outputSchema.parse({ success: !!json?.success });
    };

    const fake = async (): Promise<MetaSwapCreativeOutput> => {
      try {
        // Prefer a fixture if one exists
        const variants = await listFixtureNames("meta.swapCreative"); // looks under src/fixtures/meta.swapCreative
        if (variants.length) {
          const variant = variants[0]; // or pick one at random
          const data = (await loadFixture(
            "meta.swapCreative",
            variant
          )) as Partial<MetaSwapCreativeOutput> & { error?: string };

          if (data?.error) throw new Error(`Demo failure: ${data.error}`);
          return outputSchema.parse({ success: data?.success ?? true });
        }
      } catch {
        // ignore + fall through to default
      }

      // Default synthetic success
      return { success: true };
    };

    return withDemo(real, fake);
  },
});

export default metaSwapCreative;

/**
Note: In the Meta Marketing API you typically update the Ad’s creative (not the AdSet).
We keep the field name adSetId for back-compat with your plan, but treat it as the Ad ID.
If you truly have an AdSet ID, you’d first select an Ad under that AdSet to update.
 */