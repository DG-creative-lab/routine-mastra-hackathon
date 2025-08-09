import { z } from "zod";

/* ----------  Primitive helpers ---------- */
const pctString     = z.string().regex(/%|\d+\s*%/, "must contain %");
const moneyString   = z.string().regex(/\$/);
const kpiString     = z.string().min(1);
const timelineItem  = z.string().min(1);

/* ----------  Re-usable blocks ---------- */
export const FeatureQualitySchema = z.object({
  precision:   z.string().optional(),
  coverage:    z.string().optional(),
  reliability: z.string().optional(),
  accuracy:    z.string().optional(),
  performance: z.string().optional(),
});

/**
 * Keep the curated fields you had,
 * but allow extra keys so teams can add arbitrary metrics without breaking validation.
 */
export const SuccessMetricsSchema = z.object({
  user_success:         z.string().optional(),
  adoption:             z.string().optional(),
  satisfaction:         z.string().optional(),
  business_impact:      moneyString.optional(),
  efficiency_gain:      z.string().optional(),
  prediction_accuracy:  pctString.optional(),
  competitive_win_rate: z.string().optional(),
  quality:              z.string().optional(),
  marketplace_growth:   z.string().optional(),
  feature_quality:      FeatureQualitySchema.optional(),
})
.passthrough(); // <— allow additional metrics keys

/* ----------  New: tool & agent-hint schemas ---------- */
export const ToolHintSchema = z.object({
  title:   z.string().optional(),
  inputs:  z.record(z.string()).optional(),   // e.g. { campaignId: "number" }
  outputs: z.record(z.string()).optional(),   // e.g. { roas: "number" }
});

export const CriticHintsSchema = z.object({
  max_bid_change_pct:    z.number().optional(),
  only_when_flag:        z.string().optional(),    // e.g. "low", "inflated"
  require_inputs:        z.array(z.string()).optional(),
  require_brand_safety:  z.boolean().optional(),
  min_seed:              z.number().int().optional(),
}).passthrough();

export const ObserverSinkSchema = z.union([
  z.object({ type: z.literal("console") }),
  z.object({ type: z.literal("jsonl"), path: z.string().optional() }),
  z.object({ type: z.literal("webhook"), url: z.string().url() }),
]);

export const ObserverHintsSchema = z.object({
  events: z.array(z.string()).optional(),
  sinks:  z.array(ObserverSinkSchema).optional(),
}).passthrough();

/* ----------  Main agent spec ---------- */
export const AgentSpecSchema = z.object({
  tagline:            z.string(),
  required_features:  z.record(z.any()), // tolerate arbitrary nesting
  success_metrics:    SuccessMetricsSchema,
  timeline:           z.record(z.union([timelineItem, z.array(timelineItem)])),

  // ── New (all optional, planner hints) ────────────────────────
  workflow_brief: z.array(z.string()).optional(), // e.g. ["ga4.pull → compute.check → gAds.updateBid(-20%)"]
  tools:          z.record(ToolHintSchema).optional(),
  kpis:           z.array(kpiString).optional(),
  critic_hints:   CriticHintsSchema.optional(),
  observer_hints: ObserverHintsSchema.optional(),
});

/* ----------  Whole JSON file ---------- */
export const SpecFileSchema = z.record(AgentSpecSchema);

/* ----------  Inferred Types ---------- */
export type AgentSpecFile = z.infer<typeof SpecFileSchema>;
export type AgentSpec     = z.infer<typeof AgentSpecSchema>;