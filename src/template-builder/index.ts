// src/template-builder/index.ts
import fs from "fs/promises";
import path from "path";
import { TOOL_REGISTRY } from "./registry";
import {
  file_planJson,
  file_nodesTs,
  file_workflowTs,
  file_criticsTs,
  file_registerTs,
  file_readmeMd,
} from "./scaffolders";
import type { BuildOptions, RoutinePlan, ToolBinding } from "./types";

export async function buildFromPlan(opts: BuildOptions) {
  const { planPath, plan: inlinePlan, outDir, title = "Generated Template", agentSpecs } = opts;

  // --- read plan either from disk or from inline object ---
  let raw: string;
  if (inlinePlan) {
    raw = JSON.stringify(inlinePlan, null, 2);
  } else if (planPath) {
    raw = await fs.readFile(planPath, "utf-8");
  } else {
    throw new Error("buildFromPlan: provide either `plan` (inline) or `planPath`.");
  }

  const plan: RoutinePlan = JSON.parse(raw);
  await fs.mkdir(outDir, { recursive: true });

  // Resolve tool bindings in the order they appear (deduped)
  const seen = new Set<string>();
  const bindings: ToolBinding[] = [];
  for (const step of plan) {
    const id = step.tool;
    if (seen.has(id)) continue;
    seen.add(id);
    const b = TOOL_REGISTRY[id];
    if (b) bindings.push(b);
  }

  // Write core files
  await fs.writeFile(path.join(outDir, "plan.json"), file_planJson(raw), "utf-8");
  await fs.writeFile(path.join(outDir, "nodes.ts"), file_nodesTs(plan), "utf-8");
  await fs.writeFile(path.join(outDir, "workflow.ts"), file_workflowTs(plan, bindings), "utf-8");
  await fs.writeFile(path.join(outDir, "critics.ts"), file_criticsTs(), "utf-8");
  await fs.writeFile(path.join(outDir, "register.ts"), file_registerTs(), "utf-8");
  await fs.writeFile(path.join(outDir, "README.md"), file_readmeMd(title), "utf-8");

  // Also emit agents.json if meta-planner provided sub-agent specs
  if (agentSpecs) {
    await fs.writeFile(
      path.join(outDir, "agents.json"),
      JSON.stringify(agentSpecs, null, 2),
      "utf-8"
    );
  }

  return { outDir, steps: plan.length, boundTools: bindings.map(b => b.id) };
}

// Barrel export convenience (optional)
// export * from "./types";