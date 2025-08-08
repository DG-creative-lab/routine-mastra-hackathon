import { createTool } from "@mastra/core/tools";
import { z } from "zod";

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

const ADS_CONSOLE_BASE =
  process.env.AMAZON_ADS_CONSOLE_BASE_URL ??
  "https://advertising.amazon.com/campaigns/audiences";

export const amcExportToAdsConsole = createTool({
  id: "amc.exportToAdsConsole",
  description:
    "Generate a deep-link to register your AMC look-alike audience in Amazon Ads Console.",
  inputSchema,
  outputSchema,

  async execute({ context }) {
    const { audienceId } = context as AmcExportToAdsConsoleInput;

    // In a real integration you'd call Amazon Ads APIs here.
    // For now we simply build the console URL with the audienceId.
    const exportUrl = `${ADS_CONSOLE_BASE}?audienceId=${encodeURIComponent(
      audienceId
    )}`;

    return outputSchema.parse({ exportUrl });
  },
});

export default amcExportToAdsConsole;