// src/template-builder/types.ts
import type { PlannerOutput } from "@/meta-planner/planner";

export type RoutineStep = {
  id: number;
  tool: string;
  inputs?: Record<string, any>;
  outputs?: string[];
  condition?: string;
  // optional tag added by meta-planner flattener
  agent?: string;
};

export type RoutinePlan = RoutineStep[];

export type ToolBinding = {
  /** tool id in the plan, e.g. "ga4.pull" */
  id: string;
  /** import symbol used in workflow.ts, e.g. ga4Pull */
  importName: string;
  /** import path for the tool, e.g. "@/tools/ga4.pull" */
  importPath: string;
  /** how to invoke the tool: receives a JS expression for inputs */
  invoke: (inputsExpr: string) => string;
};

/**
 * Build options:
 * - You may provide `planPath` (read from disk) OR `plan` (inline object).
 * - `agentSpecs` is optional; if present we'll emit agents.json as well.
 */
export type BuildOptions = {
  planPath?: string;
  plan?: RoutinePlan;
  outDir: string;
  title?: string;
  agentSpecs?: PlannerOutput;
};