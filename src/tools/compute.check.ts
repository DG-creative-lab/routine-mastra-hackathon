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
export const computeCheck = createTool<
  typeof InSchema,
  typeof OutSchema
>({
  id:          "compute.check",
  description: "Return 'low' when ROAS < threshold",
  inputSchema:  InSchema,
  outputSchema: OutSchema,

  async execute({ context }: ToolExecutionContext<typeof InSchema>) {
    const { roas, threshold } = context;
    return { flag: roas < threshold ? "low" : "ok" };
  },
});