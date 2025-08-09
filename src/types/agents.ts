// src/types/agents.ts
import type { RoutineStep } from "./canonical";

export type AgentRole = "planner" | "executor" | "critic" | "observer";

/** Critic rules (simple, scaffolder-friendly shape) */
export type CriticRule = {
  id: string;
  name: string;
  when?: string;                         // boolean expr, may reference ctx like "$1.flag === 'low'"
  severity?: "error" | "warn";
  action?: string;                       // message / hint
  description?: string;
};

/** What the observer generator needs */
export type ObserverSpec = {
  counters?: string[];
  gauges?: string[];
  events?: string[];
  notes?: string;
};

export type AgentSpecItem = {
  role: AgentRole;
  name: string;
  instructions?: string;
  tools_allowed?: string[];
  kpis?: string[];
  guardrails?: string[];

  // Only the planner agent includes steps:
  routine_steps?: RoutineStep[];

  // Only the critic agent uses this:
  critic_rules?: CriticRule[];

  // Only the observer agent uses this:
  observer?: ObserverSpec;
};

export type AgentSpec = {
  channel_id: string;        // e.g. "search_bid_guardian"
  agents: AgentSpecItem[];
};

export type PlannerOutput = {
  agent_specs: AgentSpec[];
};