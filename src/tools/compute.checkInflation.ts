import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/* 1) Define your input & output schemas */
export const inputSchema = z.object({
  deltaPct:  z.number(),
  threshold: z.number(),
});
export type CheckInflationInput  = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  flag: z.enum(["inflated", "ok"]),
});
export type CheckInflationOutput = z.infer<typeof outputSchema>;

/* 2) Create the tool with the correct execute signature */
export const computeCheckInflation = createTool({
  id:          "compute.checkInflation",
  description: "Flag if CPM percent‐change exceeds the given threshold.",

  inputSchema,
  outputSchema,

  // Mastra passes a ToolExecutionContext where validated input lives on `context`.
  // According to docs, workflows/steps expose `inputData`, while tools expose `context`.
  async execute({ context }) {
    const { deltaPct, threshold } = context as CheckInflationInput;
    const flag: CheckInflationOutput["flag"] = deltaPct > threshold ? "inflated" : "ok";
    return { flag };
  },
});

export default computeCheckInflation;
