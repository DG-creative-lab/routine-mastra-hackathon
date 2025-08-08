import fs from "fs/promises";
import path from "path";
import { SpecFileSchema, AgentSpecFile } from "./schema";
import { normaliseAgentSpec } from "./normalize";

/* ----------  Public API ------------- */

/**
 * Load & validate a requirements JSON file, returning a
 * canonicalised object ready for the LLM planner.
 */
export async function parseSpec(filePath: string): Promise<AgentSpecFile> {
  const abs = path.resolve(filePath);
  const raw = await fs.readFile(abs, "utf-8");
  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch (err) {
    throw new Error(`❌   Spec is not valid JSON → ${abs}`);
  }

  /* 1️⃣  Validate structure with Zod */
  const parsed = SpecFileSchema.safeParse(json);
  if (!parsed.success) {
    console.error(parsed.error.format());
    throw new Error(`❌   Spec validation failed for ${abs}`);
  }

  /* 2️⃣  Normalise every agent block */
  const canonical: any = {};
  Object.entries(parsed.data).forEach(([agentKey, agentSpec]) => {
    canonical[agentKey] = normaliseAgentSpec(agentSpec);
  });

  return canonical as AgentSpecFile;
}

/* ----------  CLI for dev convenience ---------- */
if (require.main === module) {
  const fp = process.argv[2];
  if (!fp) {
    console.log("Usage: ts-node parser/index.ts <spec.json>");
    process.exit(0);
  }
  parseSpec(fp)
    .then((out) => {
      console.log("✅  Spec parsed & normalised:");
      console.dir(out, { depth: null, colors: true });
    })
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}