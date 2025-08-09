// src/types/cannonical.ts

// Hints about a tool (purely for planning; keep loose on purpose)
export interface ToolHint {
  title?: string;
  inputs?: Record<string, string>;   // e.g. { campaignId: "number" }
  outputs?: Record<string, string>;  // e.g. { roas: "number" }
}

// Planner-consumable critic hints (extend as needed)
export type CriticHints = {
  max_bid_change_pct?: number;
  only_when_flag?: string;           // e.g. "low", "inflated", "fatigued"
  require_inputs?: string[];         // e.g. ["campaignId","percent"]
  require_brand_safety?: boolean;    // for Meta creative swaps
  min_seed?: number;                 // for AMC LAL
  [key: string]: unknown;
};

// Planner-consumable observer hints (what to emit in observer agent)
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

  // ── NEW (all optional; safe for older specs) ─────────────────
  workflow_brief?: string[];                 // e.g. ["ga4.pull → compute.check → gAds.updateBid(-20%)"]
  tools?: Record<string, ToolHint>;          // tool ID → hints (title, IO shapes)
  kpis?: string[];                           // e.g. ["roas","bid_delta_pct"]
  critic_hints?: CriticHints;                // guard-rail hints
  observer_hints?: ObserverHints;            // logging/telemetry hints
}

// NOTE: LLM-generated steps typically arrive without IDs;
// we assign them during flattening. Make id optional.
export interface RoutineStep {
  id?: number;
  tool: string;
  inputs: Record<string, any>;
  outputs?: string[];
  condition?: string;
  description?: string; // optional, handy for docs
}

// (optional helpers if you like)
export type CanonicalSpecMap = Record<string, Omit<CanonicalSpec, "id">>;