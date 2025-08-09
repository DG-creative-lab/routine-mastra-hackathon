import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { RoutineStep, CanonicalSpec } from "../types/canonical";

/** Roles across channels */
export type AgentRole = "planner" | "executor" | "critic" | "observer";

/** Critic rule DSL (small & explicit) */
export type CriticRule =
  | { type: "bound_change_pct"; tool: string; maxAbsPct: number }   // e.g. gAds.updateBid <= 25%
  | { type: "gate_on_flag";      flagFrom: string; equals: string } // e.g. only when compute.check.flag == "low"
  | { type: "require_inputs";    tool: string; keys: string[] }
  | { type: "brand_safety";      minScore?: number };

/** Observer sink + spec */
export type ObserverSink =
  | { type: "console" }
  | { type: "jsonl"; path?: string }
  | { type: "webhook"; url: string };

export type ObserverEventName =
  | "plan_started" | "plan_finished"
  | "step_started" | "step_finished" | "step_error"
  | "tool_called"  | "tool_result"
  | "critic_failure"
  | "reward";

export type ObserverSpec = {
  sinks: ObserverSink[];
  events?: ObserverEventName[];
  kpis?: string[];
};

/** Agent spec item */
export type AgentSpecItem = {
  role: AgentRole;
  name: string;
  instructions?: string;
  tools_allowed?: string[];   // for executor
  kpis?: string[];            // hints for observer/critic
  guardrails?: CriticRule[];  // only for critic
  routine_steps?: RoutineStep[]; // only planner
  observer?: ObserverSpec;    // only observer
};

/** Per channel */
export type AgentSpec = {
  channel_id: string;      // e.g. "search_bid_guardian"
  agents: AgentSpecItem[];
};

export type PlannerOutput = {
  agent_specs: AgentSpec[];
};

/* ---------- helpers ---------- */
function safeJsonParse(s: string): any {
  try {
    const trimmed = s.trim().replace(/^```(json)?\n?/i, "").replace(/```$/, "");
    return JSON.parse(trimmed);
  } catch {
    throw new Error("LLM did not return valid JSON for agent_specs.");
  }
}

/* ---------- main: ask LLM to produce agent_specs ---------- */
export async function makeAgentSpecs(specs: CanonicalSpec[]): Promise<PlannerOutput> {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
  });

  const completion = await openai.chat.completions.create({
    model: "openrouter/horizon-beta",
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: buildUserPrompt(specs) }
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed  = safeJsonParse(content);

  if (!parsed || !Array.isArray(parsed.agent_specs)) {
    throw new Error("agent_specs missing or not an array in planner output.");
  }
  return parsed as PlannerOutput;
}

/* ---------- flatten planner steps → Routine plan ---------- */
export function flattenToRoutinePlan(out: PlannerOutput): RoutineStep[] {
  const steps: RoutineStep[] = [];
  let id = 1;

  for (const ch of out.agent_specs) {
    const planner = ch.agents.find(a => a.role === "planner");
    if (!planner?.routine_steps?.length) continue;

    for (const s of planner.routine_steps) {
      steps.push({
        ...s,
        id: id++,
        tool: s.tool,
        inputs: s.inputs ?? {},
        outputs: s.outputs ?? [],
        condition: s.condition,
        // @ts-ignore: helpful tag for logs/middleware
        agent: `${ch.channel_id}:planner`,
      });
    }
  }
  return steps;
}

/* ---------- optional helpers for builder ---------- */
export function extractCritics(out: PlannerOutput) {
  const byChannel: Record<string, CriticRule[]> = {};
  for (const ch of out.agent_specs) {
    const critic = ch.agents.find(a => a.role === "critic");
    if (critic?.guardrails?.length) byChannel[ch.channel_id] = critic.guardrails;
  }
  return byChannel;
}

export function extractObservers(out: PlannerOutput) {
  const byChannel: Record<string, ObserverSpec> = {};
  for (const ch of out.agent_specs) {
    const obs = ch.agents.find(a => a.role === "observer")?.observer;
    if (obs) byChannel[ch.channel_id] = obs;
  }
  return byChannel;
}