// --------------------------------------------------------------
// Purpose: Generate (or regenerate) `plan.json` automatically
//          from a human-written `agents_spec.json` file.
//
// Usage:   pnpm ts-node meta-planner/planner.ts
//
// Env:     Requires OPENROUTER_API_KEY (.env loaded via dotenv)
// --------------------------------------------------------------

import * as fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { CanonicalSpec, RoutineStep } from "../types/cannonical";

// ────────────────────────────────────────────────────────────
// Config & helper types
// ----------------------------------------------------------------
dotenv.config(); 

const AGENT_SPEC_PATH = path.resolve(__dirname, "../parser/agents_spec.json";
const ROOT          = path.resolve(__dirname, "..");                // /src
const SPEC_PATH     = path.join(ROOT, "parser/agents_spec.json");
const GENERATED_DIR = path.join(ROOT, "..", "generated-templates"); // at repo root
const OUTPUT_PLAN   = path.join(GENERATED_DIR, "plan.json");

const MODEL_ID = "openrouter/horizon-beta";
//  ────────────────────────────────────────────────────────────
// Utility – read & normalise the agents_spec.json
// ----------------------------------------------------------------
async function loadAndNormaliseSpec(): Promise<CanonicalSpec[]> {
  const raw = await fs.readFile(AGENT_SPEC_PATH, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;


  const normalised: CanonicalSpec[] = Object.entries(parsed).map(
    ([key, value]) => {
      const v = value as any;
      return {
        id: key,
        tagline: v.tagline,
        required_features: v.required_features,
        success_metrics: v.success_metrics,
        timeline: v.timeline,
      };
    }
  );
  return normalised;
}

//  ────────────────────────────────────────────────────────────
// Call LLM to categorise → agent buckets
// ----------------------------------------------------------------

async function categoriseWithLLM(spec: CanonicalSpec[]) {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  const completion = await openai.chat.completions.create({
    model: MODEL_ID,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: buildUserPrompt(spec) }
    ],
  });

  const content = completion.choices[0].message.content || "{}";
  return JSON.parse(content);
}

//  ────────────────────────────────────────────────────────────
// Build the Routine plan programmatically
// ----------------------------------------------------------------
function buildRoutinePlan(agentBuckets: unknown): RoutineStep[] {
  let id = 1;
  const steps: RoutineStep[] = [
    { id: id++, tool: "fs.readJson", inputs: { path: SPEC_PATH }, outputs: ["specObj"] },
    { id: id++, tool: "spec.normalize", inputs: { spec: "$1.specObj" }, outputs: ["canonicalSpec"] },
    { id: id++, tool: "llm.classifyReqs", inputs: { jsonSpec: "$2.canonicalSpec", llm: MODEL_ID, temp: 0.2 }, outputs: ["agentBuckets"] },
    { id: id++, tool: "constant.set", inputs: { value: agentBuckets }, outputs: ["agentBucketsStatic"] },
    { id: id++, tool: "routine.planMaker", inputs: { agentBuckets: "$4.agentBucketsStatic" }, outputs: ["routinePlans"] },
    { id: id++, tool: "mastra.scaffold", inputs: { plans: "$5.routinePlans", outDir: GENERATED_DIR }, outputs: ["paths"] },
    { id: id++, tool: "docs.generateSummary", inputs: { templatePaths: "$6.paths", spec: "$2.canonicalSpec" }, outputs: ["readme"] },
    { id: id++, tool: "fs.writeFile", inputs: { path: path.join(GENERATED_DIR, "README.md"), data: "$7.readme" } }
  ];
  return steps;
}

//  ────────────────────────────────────────────────────────────
// MAIN – orchestrate the above steps
// ----------------------------------------------------------------
async function main() {
  const spec  = await loadAndNormaliseSpec();
  const map   = await categoriseWithLLM(spec);
  const plan  = buildRoutinePlan(map);

  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_PLAN, JSON.stringify(plan, null, 2), "utf-8");

  console.log("✅  Templates scaffolded to:", GENERATED_DIR);
}

main().catch(err => { console.error(err); process.exit(1); });