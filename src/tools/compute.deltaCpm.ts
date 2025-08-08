import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const inputSchema = z.object({
  oldCpm: z.number().nonnegative(),
  newCpm: z.number().nonnegative(),
});
export type DeltaCpmInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  deltaPct: z.number(),
});
export type DeltaCpmOutput = z.infer<typeof outputSchema>;

// Define the tool
export const computeDeltaCpm = createTool({
  id:          "compute.deltaCpm",
  description: "Compute percent change between old and new CPM values.",
  inputSchema,
  outputSchema,

  async execute({ context }: { context: DeltaCpmInput }) {
    const { oldCpm, newCpm } = context;

    if (oldCpm === 0) {
      // Avoid divide-by-zero — treat any newCpm > 0 as infinite increase
      return { deltaPct: newCpm === 0 ? 0 : Infinity };
    }

    const deltaPct = ((newCpm - oldCpm) / oldCpm) * 100;
    return { deltaPct };
  },
});

// default export for easier imports
export default computeDeltaCpm;