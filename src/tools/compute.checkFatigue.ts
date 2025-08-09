import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Inputs:
 *   - frequency: current ad-set frequency
 *   - audienceSize: remaining audience size
 *   - maxFrequency (optional): override default max frequency (default 6)
 *   - minAudience (optional): override default min audience size (default 50,000)
 *
 * Output:
 *   - flag: "fatigued" if frequency > maxFrequency OR audienceSize < minAudience; else "ok"
 */
export const inputSchema = z.object({
  frequency:    z.number().nonnegative(),
  audienceSize: z.number().nonnegative(),
  maxFrequency: z.number().nonnegative().default(6),
  minAudience:  z.number().nonnegative().default(50_000),
});
export type CheckFatigueInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  flag: z.enum(["fatigued", "ok"]),
});
export type CheckFatigueOutput = z.infer<typeof outputSchema>;

export const computeCheckFatigue = createTool<typeof inputSchema, typeof outputSchema>({
  id:          "compute.checkFatigue",
  description:
    "Flag ad-set as fatigued when frequency > maxFrequency or audienceSize < minAudience",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { frequency, audienceSize, maxFrequency, minAudience } =
      inputSchema.parse(context as unknown);

    // Small numeric sanity guard
    const all = [frequency, audienceSize, maxFrequency, minAudience];
    if (!all.every(Number.isFinite)) {
      throw new Error("compute.checkFatigue received non-finite inputs");
    }

    const isFatigued = frequency > maxFrequency || audienceSize < minAudience;
    return outputSchema.parse({ flag: isFatigued ? "fatigued" : "ok" });
  },
});

export default computeCheckFatigue;