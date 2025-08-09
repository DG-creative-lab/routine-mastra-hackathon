import { z } from "zod";
import { createTool, ToolExecutionContext } from "@mastra/core/tools";

/*------------------------------------------------------------
  Re-usable Zod schemas
------------------------------------------------------------*/
const InSchema  = z.object({
  roas:      z.number(),
  threshold: z.number(),
});
const OutSchema = z.object({
  flag: z.enum(["low", "ok"]),
});

/*------------------------------------------------------------
  Tool definition
------------------------------------------------------------*/
export const computeCheck = createTool<typeof InSchema, typeof OutSchema>({
  id:          "compute.check",
  description: "Return 'low' when ROAS < threshold; otherwise 'ok'.",
  inputSchema:  InSchema,
  outputSchema: OutSchema,

  async execute({ context }: ToolExecutionContext<typeof InSchema>) {
    const { roas, threshold } = InSchema.parse(context as unknown);

    // A tiny sanity guard to avoid NaN propagation in weird pipelines
    if (!Number.isFinite(roas) || !Number.isFinite(threshold)) {
      throw new Error("compute.check received non-finite inputs");
    }

    return OutSchema.parse({ flag: roas < threshold ? "low" : "ok" });
  },
});

export default computeCheck;