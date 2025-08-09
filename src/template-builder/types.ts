import type { RoutinePlan } from "@/types/canonical";
import type { PlannerOutput } from "@/types/agents";

export type ToolBinding = {
  /** tool id in the plan, e.g. "ga4.pull" */
  id: string;
  /** import symbol used in workflow.ts, e.g. ga4Pull */
  importName: string;
  /** import path for the tool, e.g. "@/tools" (barrel) */
  importPath: string;
  /** how to invoke the tool: receives a JS expression for inputs */
  invoke: (inputsExpr: string) => string;
};

export type BuildOptions = {
  /** Provide either a path to a plan.json OR an inline plan */
  planPath?: string;
  plan?: RoutinePlan;
  outDir: string;
  title?: string;

  /** full meta-planner output (we’ll emit agents.json & derive critics/observer) */
  agentSpecs?: PlannerOutput;
};