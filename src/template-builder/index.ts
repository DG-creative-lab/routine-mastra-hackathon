import fs from "fs/promises";
import path from "path";
import { TOOL_REGISTRY } from "./registry";
import {
  file_planJson,
  file_nodesTs,
  file_workflowTs,
  file_criticsTs,
  file_observerTs,
  file_registerTs,
  file_readmeMd,
} from "./scaffolders";
import type { CriticRule } from "../types/agents";
import type { BuildOptions,  ToolBinding } from "./types";
import type { RoutinePlan } from "@/types/canonical";
import type { ObserverSpec, PlannerOutput } from "@/types/agents";

/** Pull critic rules & observer spec out of PlannerOutput (loose shape on purpose) */
function extractCriticsAndObserver(agentSpecs?: PlannerOutput): { critics: CriticRule[]; observer?: ObserverSpec } {
  const critics: CriticRule[] = [];
  let observer: ObserverSpec | undefined;

  if (!agentSpecs?.agent_specs) return { critics, observer };

  for (const ch of agentSpecs.agent_specs) {
    for (const a of ch.agents ?? []) {
      if (a.role === "critic") {
        const rules = (a as any).rules ?? (a as any).critic_rules ?? [];
        for (const r of rules as any[]) {
          critics.push({
            id: r.id ?? `${ch.channel_id}.${a.name}.${r.name ?? "rule"}`,
            name: r.name ?? "unnamed",
            when: r.when,
            severity: r.severity ?? "warn",
            action: r.action,
            description: r.description,
          });
        }
      } else if (a.role === "observer" && !observer) {
        observer = {
          counters: (a as any).counters ?? [],
          gauges:   (a as any).gauges ?? [],
          events:   (a as any).events ?? [],
          notes:    a.instructions ?? "",
        };
      }
    }
  }
  return { critics, observer };
}

export async function buildFromPlan(opts: BuildOptions) {
  const { planPath, plan: inlinePlan, outDir, title = "Generated Template", agentSpecs } = opts;

  let raw: string;
  if (inlinePlan) raw = JSON.stringify(inlinePlan, null, 2);
  else if (planPath) raw = await fs.readFile(planPath, "utf-8");
  else throw new Error("buildFromPlan: provide either `plan` (inline) or `planPath`.");

  const plan: RoutinePlan = JSON.parse(raw);
  await fs.mkdir(outDir, { recursive: true });

  // Resolve tool bindings in appearance order (deduped)
  const seen = new Set<string>();
  const bindings: ToolBinding[] = [];
  for (const step of plan) {
    const id = step.tool;
    if (seen.has(id)) continue;
    seen.add(id);
    const b = TOOL_REGISTRY[id];
    if (b) bindings.push(b);
  }

  // Extract critics & observer (if any)
  const { critics, observer } = extractCriticsAndObserver(agentSpecs as PlannerOutput | undefined);

  // Write core files
  await fs.writeFile(path.join(outDir, "plan.json"), file_planJson(raw), "utf-8");
  await fs.writeFile(path.join(outDir, "nodes.ts"), file_nodesTs(plan), "utf-8");
  await fs.writeFile(path.join(outDir, "workflow.ts"), file_workflowTs(plan, bindings), "utf-8");
  await fs.writeFile(path.join(outDir, "critics.ts"), file_criticsTs(critics), "utf-8");
  await fs.writeFile(path.join(outDir, "observer.ts"), file_observerTs(observer), "utf-8");
  await fs.writeFile(path.join(outDir, "register.ts"), file_registerTs(), "utf-8");
  await fs.writeFile(path.join(outDir, "README.md"), file_readmeMd(title), "utf-8");

  // Also emit agents.json if provided
  if (agentSpecs) {
    await fs.writeFile(path.join(outDir, "agents.json"), JSON.stringify(agentSpecs, null, 2), "utf-8");
  }

  return { outDir, steps: plan.length, boundTools: bindings.map(b => b.id) };
}