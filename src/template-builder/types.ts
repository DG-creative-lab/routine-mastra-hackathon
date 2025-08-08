export type RoutineStep = {
  id: number;
  tool: string;                     // e.g., "ga4.pull"
  description?: string;
  inputs?: Record<string, any>;     // unresolved (may contain $ refs)
  outputs?: string[];               // names e.g., ["rows"]
  condition?: string;               // e.g., "$2.flag == 'low'"
};

export type RoutinePlan = RoutineStep[];

export type ToolBinding = {
  id: string;                       // "ga4.pull"
  importName: string;               // symbol to import in workflow.ts
  importPath: string;               // from generated folder to your tools index
  // How to invoke the tool. Receive a JS expression string for the inputs object.
  // Return JS that evaluates to a Promise<any> (the tool result).
  invoke: (inputsExpr: string) => string;
};

export type BuildOptions = {
  outDir: string;                   // folder to generate into
  planPath: string;                 // path to plan.json
  templateName?: string;            // e.g., "search-bid-guardian"
  title?: string;                   // readme title
};