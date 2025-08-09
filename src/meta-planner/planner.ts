import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";
import { CanonicalSpec, RoutineStep } from "../types/canonical";

// ---------- NEW TYPES ----------
export type AgentRole = "planner" | "executor" | "critic" | "observer";

export type AgentSpecItem = {
  role: AgentRole;
  name: string;
  instructions?: string;
  tools_allowed?: string[];
  kpis?: string[];
  guardrails?: string[];
  routine_steps?: RoutineStep[]; // only planner will include steps
};

export type AgentSpec = {
  channel_id: string;      // e.g. "search_bid_guardian"
  agents: AgentSpecItem[];
};

export type PlannerOutput = {
  agent_specs: AgentSpec[];
};

// ---------- UTILS ----------
function safeJsonParse(s: string): any {
  try {
    // strip code fences if any
    const trimmed = s.trim().replace(/^```(json)?\n?/i, "").replace(/```$/, "");
    return JSON.parse(trimmed);
  } catch (e) {
    throw new Error("LLM did not return valid JSON for agent_specs.");
  }
}

// ---------- NEW: makeAgentSpecs ----------
export async function makeAgentSpecs(spec: CanonicalSpec): Promise<PlannerOutput> {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
  });

  const completion = await openai.chat.completions.create({
    model: "openrouter/horizon-beta",
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },       // must instruct to return { agent_specs: [...] }
      { role: "user", content: buildUserPrompt(spec) }, // pass CanonicalSpec[] with tools/workflow_brief
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = safeJsonParse(content);

  // basic shape guard
  if (!parsed || !Array.isArray(parsed.agent_specs)) {
    throw new Error("agent_specs missing or not an array in planner output.");
  }

  return parsed as PlannerOutput;
}

// ---------- NEW: flatten sub-agent plans → RoutineStep[] ----------
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
        // keep original if present; otherwise carry over tool/inputs/outputs/condition
        tool: s.tool,
        inputs: s.inputs ?? {},
        outputs: s.outputs ?? [],
        condition: s.condition,
        // optional: tag step with agent/channel for middleware/logs
        // @ts-ignore
        agent: `${ch.channel_id}:planner`,
      });
    }
  }

  return steps;
}