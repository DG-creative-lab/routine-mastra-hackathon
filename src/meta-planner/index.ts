export { makeAgentSpecs, flattenToRoutinePlan } from "./planner";

// Re-export the shared types (single source of truth)
export type { PlannerOutput, AgentSpec, AgentSpecItem } from "@/types/agents";
export type { CanonicalSpec, RoutineStep } from "@/types/canonical";

