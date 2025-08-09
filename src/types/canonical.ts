/** Tool hints used only at planning time (loose on purpose). */
export interface ToolHint {
  title?: string;
  inputs?: Record<string, string>;   // e.g. { campaignId: "number" }
  outputs?: Record<string, string>;  // e.g. { roas: "number" }
}

/** Planner-consumable critic hints (you can extend freely). */
export type CriticHints = {
  max_bid_change_pct?: number;
  only_when_flag?: string;           // e.g. "low", "inflated", "fatigued"
  require_inputs?: string[];         // e.g. ["campaignId","percent"]
  require_brand_safety?: boolean;    // for Meta creative swaps
  min_seed?: number;                 // for AMC LAL
  [key: string]: unknown;
};

/** Planner-consumable observer hints. */
export type ObserverHints = {
  events?: string[];                 // e.g. ["plan_started","tool_result"]
  sinks?: Array<
    | { type: "console" }
    | { type: "jsonl"; path?: string }
    | { type: "webhook"; url: string }
  >;
  [key: string]: unknown;
};

export interface CanonicalSpec {
  id: string;
  tagline: string;
  required_features: Record<string, unknown>;
  success_metrics: Record<string, unknown>;
  timeline: Record<string, unknown>;

  // Optional, safe for older specs
  workflow_brief?: string[];                 // e.g. ["ga4.pull → compute.check → gAds.updateBid(-20%)"]
  tools?: Record<string, ToolHint>;          // tool ID → hints
  kpis?: string[];                           // e.g. ["roas","bid_delta_pct"]
  critic_hints?: CriticHints;
  observer_hints?: ObserverHints;
}

/** Routine execution step (LLM may omit id; we assign during flattening). */
export interface RoutineStep {
  id?: number;
  tool: string;
  inputs: Record<string, any>;
  outputs?: string[];
  condition?: string;
  description?: string; // optional, handy for docs
  // optional tag added by meta-planner flattener
  agent?: string;
}

export type RoutinePlan = RoutineStep[];
export type CanonicalSpecMap = Record<string, Omit<CanonicalSpec, "id">>;