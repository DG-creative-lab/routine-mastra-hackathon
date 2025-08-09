import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";

export const inputSchema = z.object({
  oldCpm: z.number().nonnegative(),
  newCpm: z.number().nonnegative(),
});
export type DeltaCpmInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  deltaPct: z.number(), // e.g. +17.5 means +17.5%
});
export type DeltaCpmOutput = z.infer<typeof outputSchema>;

export const computeDeltaCpm = createTool<typeof inputSchema, typeof outputSchema>({
  id:          "compute.deltaCpm",
  description: "Compute percent change between old and new CPM values.",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const { oldCpm, newCpm } = inputSchema.parse(context as unknown);

    if (!Number.isFinite(oldCpm) || !Number.isFinite(newCpm)) {
      throw new Error("compute.deltaCpm received non-finite inputs");
    }

    // Avoid divide-by-zero explosions and JSON Infinity issues:
    // - If both are zero → 0%
    // - If old is zero but new > 0 → treat as “effectively infinite” rise; clamp to a large finite number.
    if (oldCpm === 0) {
      const deltaPct = newCpm === 0 ? 0 : 1_000_000; // +1,000,000% to signal “infinite” rise
      return outputSchema.parse({ deltaPct });
    }

    const deltaPct = ((newCpm - oldCpm) / oldCpm) * 100;
    return outputSchema.parse({ deltaPct });
  },
});

export default computeDeltaCpm;