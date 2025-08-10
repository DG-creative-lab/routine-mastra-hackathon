import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt";

import type { CanonicalSpec, RoutineStep } from "@/types/canonical";
import type { PlannerOutput } from "@/types/agents";

// ---------- utils ----------
function safeJsonParse(s: string): any {
  try {
    const trimmed = s.trim().replace(/^```(?:json)?\n?/i, "").replace(/```$/, "");
    return JSON.parse(trimmed);
  } catch {
    throw new Error("LLM did not return valid JSON for agent_specs.");
  }
}

// ---------- makeAgentSpecs ----------
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
      { role: "user", content: buildUserPrompt(specs) },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const parsed = safeJsonParse(content);

  if (!parsed || !Array.isArray(parsed.agent_specs)) {
    throw new Error("agent_specs missing or not an array in planner output.");
  }
  return parsed as PlannerOutput;
}

// ---------- flatten sub-agent plans → RoutineStep[] ----------
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
        // tag for logs if you want: @ts-expect-error tag for internal use
        agent: `${ch.channel_id}:planner`,
      });
    }
  }
  return steps;
}