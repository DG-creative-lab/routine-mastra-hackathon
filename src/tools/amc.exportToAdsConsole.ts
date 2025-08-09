// src/tools/amc.exportToAdsConsole.ts
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { withDemo } from "@/utils";

/**
 * Input: the AMC audience ID you just created
 * Output: a deep-link URL pointing to Amazon Ads console’s audience page
 */
export const inputSchema = z.object({
  audienceId: z.string().min(1),
});
export type AmcExportToAdsConsoleInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  exportUrl: z.string().url(),
});
export type AmcExportToAdsConsoleOutput = z.infer<typeof outputSchema>;

/** Base Console URL – can be overridden via env */
function consoleBase(): string {
  const raw =
    process.env.AMAZON_ADS_CONSOLE_BASE_URL ??
    "https://advertising.amazon.com/campaigns/audiences";
  // strip trailing slash to avoid double slashes
  return raw.replace(/\/+$/, "");
}

export const amcExportToAdsConsole = createTool({
  id: "amc.exportToAdsConsole",
  description:
    "Generate a deep-link to register your AMC look-alike audience in Amazon Ads Console.",
  inputSchema,
  outputSchema,

  async execute(ctx: ToolExecutionContext<typeof inputSchema>) {
    const { audienceId } = inputSchema.parse(ctx.context as unknown);

    const run = async () => {
      const base = consoleBase();
      const advertiserId = process.env.AMAZON_ADVERTISER_ID
        ? String(process.env.AMAZON_ADVERTISER_ID)
        : undefined;

      const url = new URL(base);
      url.searchParams.set("audienceId", audienceId);
      if (advertiserId) url.searchParams.set("advertiserId", advertiserId);

      return outputSchema.parse({ exportUrl: url.toString() });
    };

    // Same in real & demo; we still go through withDemo to keep latency/consistency
    return withDemo(run, run);
  },
});

export default amcExportToAdsConsole;