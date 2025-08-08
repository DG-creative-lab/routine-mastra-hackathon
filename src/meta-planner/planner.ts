// --------------------------------------------------------------
// Purpose: Generate (or regenerate) `plan.json` automatically
//          from a human-written `agents_spec.json` file.
// Usage:   pnpm ts-node meta-planner/planner.ts
// Env:     Requires OPENROUTER_API_KEY (.env loaded via dotenv)
// --------------------------------------------------------------

import * as fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { CanonicalSpec, RoutineStep } from "../types/cannonical";

dotenv.config();

// ────────────────────────────────────────────────────────────
// Config & helper paths
// ────────────────────────────────────────────────────────────
const ROOT          = path.resolve(__dirname, "..");                // src/
const SPEC_PATH     = path.join(ROOT, "parser/agents_spec.json");
const GENERATED_DIR = path.join(ROOT, "..", "generated-templates");
const OUTPUT_PLAN   = path.join(GENERATED_DIR, "plan.json");

const MODEL_ID = "openrouter/horizon-beta";

// ────────────────────────────────────────────────────────────
// Utility – read & normalise the agents_spec.json
// ────────────────────────────────────────────────────────────
async function loadAndNormaliseSpec(): Promise<CanonicalSpec[]> {
  const raw = await fs.readFile(SPEC_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, any>;

  return Object.entries(parsed).map(([id, value]) => ({
    id,
    tagline: value.tagline,
    required_features: value.required_features,
    success_metrics: value.success_metrics,
    timeline: value.timeline,
  }));
}

// ────────────────────────────────────────────────────────────
// Call LLM to categorise → agent buckets
// ────────────────────────────────────────────────────────────
export async function categoriseWithLLM(
  spec: CanonicalSpec[]
): Promise<Record<string, string[]>> {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
  });

  const completion = await openai.chat.completions.create({
    model: MODEL_ID,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: buildUserPrompt(spec) },
    ],
  });

  const content = completion.choices[0].message.content || "{}";
  return JSON.parse(content);
}

// ────────────────────────────────────────────────────────────
// Build the Routine plan programmatically
// ────────────────────────────────────────────────────────────
export function buildRoutinePlan(agentBuckets: unknown): RoutineStep[] {
  let id = 1;
  return [
    { id: id++, tool: "fs.readJson", inputs: { path: SPEC_PATH }, outputs: ["specObj"] },
    { id: id++, tool: "spec.normalize", inputs: { spec: "$1.specObj" }, outputs: ["canonicalSpec"] },
    { id: id++, tool: "llm.classifyReqs", inputs: { jsonSpec: "$2.canonicalSpec", llm: MODEL_ID, temp: 0.2 }, outputs: ["agentBuckets"] },
    { id: id++, tool: "constant.set", inputs: { value: agentBuckets }, outputs: ["agentBucketsStatic"] },
    { id: id++, tool: "routine.planMaker", inputs: { agentBuckets: "$4.agentBucketsStatic" }, outputs: ["routinePlans"] },
    { id: id++, tool: "mastra.scaffold", inputs: { plans: "$5.routinePlans", outDir: GENERATED_DIR }, outputs: ["paths"] },
    { id: id++, tool: "docs.generateSummary", inputs: { templatePaths: "$6.paths", spec: "$2.canonicalSpec" }, outputs: ["readme"] },
    { id: id++, tool: "fs.writeFile", inputs: { path: path.join(GENERATED_DIR, "README.md"), data: "$7.readme" } },
  ];
}

// ────────────────────────────────────────────────────────────
// Convenience helper: load → categorize → buildPlan
// ────────────────────────────────────────────────────────────
export async function makePlan(): Promise<RoutineStep[]> {
  const spec      = await loadAndNormaliseSpec();
  const buckets   = await categoriseWithLLM(spec);
  const routine   = buildRoutinePlan(buckets);
  
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_PLAN, JSON.stringify(routine, null, 2), "utf-8");

  return routine;
}

// If invoked directly, write out plan.json and exit
if (require.main === module) {
  makePlan()
    .then(() => console.log("✅  plan.json generated in", GENERATED_DIR))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}