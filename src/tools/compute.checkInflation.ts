import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";

/* 1) Define input & output schemas */
export const inputSchema = z.object({
  deltaPct:  z.number(),          // percent change, e.g. 17.5 for +17.5%
  threshold: z.number(),          // trigger threshold, e.g. 15 for +15%
});
export type CheckInflationInput  = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  flag: z.enum(["inflated", "ok"]),
});
export type CheckInflationOutput = z.infer<typeof outputSchema>;

/* 2) Create the tool */
export const computeCheckInflation = createTool<typeof inputSchema, typeof outputSchema>({
  id:          "compute.checkInflation",
  description: "Flag if CPM percent‐change exceeds the given (upper) threshold.",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { deltaPct, threshold } = inputSchema.parse(context as unknown);

    if (!Number.isFinite(deltaPct) || !Number.isFinite(threshold)) {
      throw new Error("compute.checkInflation received non-finite inputs");
    }

    // NOTE: This checks for *upward* inflation only (deltaPct > threshold).
    // If you later want symmetric checks (|deltaPct| > threshold), switch to Math.abs(deltaPct).
    const flag: CheckInflationOutput["flag"] =
      deltaPct > threshold ? "inflated" : "ok";

    return outputSchema.parse({ flag });
  },
});

export default computeCheckInflation;
