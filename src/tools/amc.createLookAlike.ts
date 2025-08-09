import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { withDemo, rand } from "@/utils";
import { loadFixture, listFixtureNames } from "@/utils/fixtures";

/**
 * Creates a look-alike audience from seed IDs.
 * REAL: AMC Audience API (or your proxy).
 * DEMO: fixture or synthetic audienceId/status.
 *
 * Env (real):
 *   AMC_API_HOST  (e.g. https://api.amc.amazon.com or your proxy)
 *   AMC_API_TOKEN (Bearer)
 */
export const inputSchema = z.object({
  seedIds: z.array(z.string()).nonempty().describe("Seed audience IDs"),
  audienceName: z.string().min(1).describe("New look-alike audience name"),
  sizeMultiplier: z.number().min(1).describe("Look-alike size factor, e.g. 2 for 2×"),
});
export type AmcCreateLookAlikeInput = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  audienceId: z.string(),
  status: z.enum(["CREATING", "READY", "FAILED"]),
});
export type AmcCreateLookAlikeOutput = z.infer<typeof outputSchema>;

const HOST  = process.env.AMC_API_HOST ?? "https://api.amc.amazon.com";
const TOKEN = process.env.AMC_API_TOKEN;

async function realCreate(input: AmcCreateLookAlikeInput): Promise<AmcCreateLookAlikeOutput> {
  if (!TOKEN) throw new Error("AMC_API_TOKEN missing. Set env or use DEMO_MODE=true.");

  const payload = {
    name: input.audienceName,
    seeds: input.seedIds,
    lookalikeSizeMultiplier: input.sizeMultiplier,
  };

  const res = await fetch(`${HOST}/v2/audiences/lookalikes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`AMC createLookAlike failed (${res.status}): ${await res.text().catch(() => "")}`);

  const raw = (await res.json()) as any;
  return outputSchema.parse({
    audienceId: String(raw.audienceId ?? raw.id ?? ""),
    status: (raw.status as any) ?? "CREATING",
  });
}

function synthId(prefix = "aud"): string {
  return `${prefix}_${Math.floor((1 + rand()) * 1e8).toString(36)}`;
}

async function fakeCreate(): Promise<AmcCreateLookAlikeOutput> {
  try {
    const variants = await listFixtureNames("amc.createLookAlike");
    if (variants.length) {
      const fx = await loadFixture("amc.createLookAlike", variants[0]) as Partial<AmcCreateLookAlikeOutput>;
      return outputSchema.parse({
        audienceId: fx.audienceId ?? synthId(),
        status: (fx.status as any) ?? "READY",
      });
    }
  } catch { /* fallthrough */ }

  return outputSchema.parse({ audienceId: synthId(), status: "READY" });
}

export const amcCreateLookAlike = createTool<typeof inputSchema, typeof outputSchema>({
  id: "amc.createLookAlike",
  description: "Create a look-alike audience from seed purchasers in AMC.",
  inputSchema,
  outputSchema,

  async execute({ context }: ToolExecutionContext<typeof inputSchema>) {
    const input = inputSchema.parse(context as unknown);
    return withDemo(() => realCreate(input), () => fakeCreate());
  },
});

export default amcCreateLookAlike;