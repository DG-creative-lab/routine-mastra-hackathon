import fs from "fs/promises";
import path from "path";
import { TOOL_REGISTRY } from "./registry";
import { file_planJson, file_nodesTs, file_workflowTs, file_criticsTs, file_registerTs, file_readmeMd } from "./scaffolders";
import type { BuildOptions, RoutinePlan, ToolBinding } from "./types";

export async function buildFromPlan(opts: BuildOptions) {
  const { planPath, outDir, title = "Generated Template" } = opts;

  const raw = await fs.readFile(planPath, "utf-8");
  const plan: RoutinePlan = JSON.parse(raw);

  await fs.mkdir(outDir, { recursive: true });

  // Resolve tool bindings in the *order they appear*, deduped
  const seen = new Set<string>();
  const bindings: ToolBinding[] = [];
  for (const step of plan) {
    const id = step.tool;
    if (seen.has(id)) continue;
    seen.add(id);
    const b = TOOL_REGISTRY[id];
    if (b) bindings.push(b);
    // else: leave unbound; generator will drop a TODO in workflow.ts
  }

  // Write files
  await fs.writeFile(path.join(outDir, "plan.json"), file_planJson(raw), "utf-8");
  await fs.writeFile(path.join(outDir, "nodes.ts"), file_nodesTs(plan), "utf-8");
  await fs.writeFile(path.join(outDir, "workflow.ts"), file_workflowTs(plan, bindings), "utf-8");
  await fs.writeFile(path.join(outDir, "critics.ts"), file_criticsTs(), "utf-8");
  await fs.writeFile(path.join(outDir, "register.ts"), file_registerTs(), "utf-8");
  await fs.writeFile(path.join(outDir, "README.md"), file_readmeMd(title), "utf-8");

  return { outDir, steps: plan.length, boundTools: bindings.map(b => b.id) };
}