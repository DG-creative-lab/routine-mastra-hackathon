import { z } from "zod";

/* ----------  Primitive helpers ---------- */
const pctString     = z.string().regex(/%|\d+\s*%/, "must contain %");
const moneyString   = z.string().regex(/\$/);
const kpiString     = z.string().min(3);
const timelineItem  = z.string().min(3);

/* ----------  Re-usable blocks ---------- */
export const FeatureQualitySchema = z.object({
  precision:   z.string().optional(),
  coverage:    z.string().optional(),
  reliability: z.string().optional(),
  accuracy:    z.string().optional(),
  performance: z.string().optional(),
});

export const SuccessMetricsSchema = z.object({
  user_success:        z.string().optional(),
  adoption:            z.string().optional(),
  satisfaction:        z.string().optional(),
  business_impact:     moneyString.optional(),
  efficiency_gain:     z.string().optional(),
  prediction_accuracy: pctString.optional(),
  competitive_win_rate:z.string().optional(),
  quality:             z.string().optional(),
  marketplace_growth:  z.string().optional(),
  feature_quality:     FeatureQualitySchema.optional(),
});

/* ----------  Main agent spec ---------- */
export const AgentSpecSchema = z.object({
  tagline:            z.string(),
  required_features:  z.record(z.any()),           // tolerate arbitrary nesting
  success_metrics:    SuccessMetricsSchema,
  timeline:           z.record(z.union([timelineItem, z.array(timelineItem)])),
});

/* ----------  Whole JSON file ---------- */
export const SpecFileSchema = z.record(AgentSpecSchema);

/* ----------  Inferred Type ---------- */
export type AgentSpecFile = z.infer<typeof SpecFileSchema>;
export type AgentSpec     = z.infer<typeof AgentSpecSchema>;