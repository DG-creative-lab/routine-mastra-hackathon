
export interface CanonicalSpec {
  id: string;
  tagline: string;
  required_features: Record<string, unknown>;
  success_metrics: Record<string, unknown>;
  timeline: Record<string, unknown>;
}

export interface RoutineStep {
  id: number;
  tool: string;
  inputs: Record<string, any>;
  outputs?: string[];
  condition?: string;
}