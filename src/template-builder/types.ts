import type { PlannerOutput } from "@/meta-planner/planner";

export type RoutineStep = {
  id: number;
  tool: string;
  inputs?: Record<string, any>;
  outputs?: string[];
  condition?: string;
  agent?: string; // optional tag from meta-planner
};

export type RoutinePlan = RoutineStep[];

/** What we pass into scaffolders to bind real tools */
export type ToolBinding = {
  id: string;
  importName: string;
  importPath: string;
  invoke: (inputsExpr: string) => string;
};

/** Optional critic/observer shapes (kept permissive on purpose) */
export type CriticRule = {
  id: string;
  name: string;
  when?: string;           // boolean expression, can reference ctx
  severity?: "error" | "warn";
  action?: string;         // message or small hint
  description?: string;
};

export type ObserverSpec = {
  counters?: string[];
  gauges?: string[];
  events?: string[];
  notes?: string;
};

export type BuildOptions = {
  planPath?: string;
  plan?: RoutinePlan;
  outDir: string;
  title?: string;

  /** full meta-planner output (we’ll emit agents.json and derive critics/observer) */
  agentSpecs?: PlannerOutput;
};