import fs from "fs/promises";
import path from "path";
import { SpecFileSchema, AgentSpecFile } from "./schema";
import { normaliseAgentSpec } from "./normalize";

/* ----------  Public API ------------- */

/**
 * Validate and normalise a spec object (in-memory).
 * Throws if invalid.
 */
export function parseSpec(raw: unknown): AgentSpecFile {
  // 1️⃣ Validate structure with Zod
  const parsed = SpecFileSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(parsed.error.format());
    throw new Error(`❌   Spec validation failed for provided object`);
  }

  // 2️⃣ Normalise every agent block
  const canonical: Record<string, unknown> = {};
  Object.entries(parsed.data).forEach(([agentKey, agentSpec]) => {
    canonical[agentKey] = normaliseAgentSpec(agentSpec);
  });

  return canonical as AgentSpecFile;
}

/**
 * Load & validate a requirements JSON file from disk.
 * Returns a canonicalised object ready for the LLM planner.
 */
export async function parseSpecFile(
  filePath: string
): Promise<AgentSpecFile> {
  const abs = path.resolve(filePath);
  let json: unknown;
  let raw: string;
  try {
    raw = await fs.readFile(abs, "utf-8");
    json = JSON.parse(raw);
  } catch (err: any) {
    throw new Error(
      err instanceof SyntaxError
        ? `❌   Spec is not valid JSON → ${abs}`
        : `❌   Failed to load spec at ${abs}: ${err.message}`
    );
  }

  return parseSpec(json);
}

/* ----------  CLI for dev convenience ---------- */
if (require.main === module) {
  const fp = process.argv[2];
  if (!fp) {
    console.log("Usage: ts-node parser/index.ts <spec.json>");
    process.exit(0);
  }
  parseSpecFile(fp)
    .then((out) => {
      console.log("✅  Spec parsed & normalised:");
      console.dir(out, { depth: null, colors: true });
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
