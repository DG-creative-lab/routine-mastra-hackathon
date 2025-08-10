import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

import { SpecFileSchema } from "@/parser/schema";
import { normaliseAgentSpec } from "@/parser/normalize";
import { TOOL_REGISTRY } from "@/template-builder/registry";
import { getLLM, LLM_MODEL } from "@/utils/llm";

export const dynamic = "force-dynamic";

function systemPrompt(toolIds: string[]) {
  return `
You convert a user's plain-English marketing task into a STRICT JSON object of type AgentSpecFile.

AgentSpecFile = Record<string, {
  tagline: string;
  required_features: Record<string, any>;
  success_metrics: Record<string, any>;
  timeline: Record<string, string | string[]>;
  workflow_brief?: string[];
  tools?: Record<string, { title?: string; inputs?: Record<string,string>; outputs?: Record<string,string> }>;
  kpis?: string[];
  critic_hints?: Record<string, any>;
  observer_hints?: { events?: string[], sinks?: Array<{type:"console"|"jsonl"|"webhook", url?:string}> };
}>;

Rules:
- OUTPUT VALID JSON ONLY. No prose, no markdown.
- Prefer these tool ids when referencing tools: ${toolIds.join(", ")}.
- If unsure about a field, omit it rather than inventing.
- Keep success_metrics concise; use natural numeric targets when given.
- Keys under required_features may be snake_case.
`.trim();
}

function userPrompt(text: string, channels?: string[]) {
  return `
USER_TASK:
${text}

TARGET_CHANNELS: ${channels?.join(", ") || "auto"}

Return a single JSON object (no code fences). Each top-level key should be a channel id
(e.g., "search_bid_guardian", "dv360_deal_optimiser", "meta_fatigue_swapper", "amc_lookalike_builder").
`.trim();
}

function stripCodeFences(s: string) {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

export async function POST(req: NextRequest) {
  try {
    // 1) Parse + validate input
    const ReqSchema = z.object({
      text: z.string().min(1, "text is required"),
      channels: z.array(z.string()).optional(),
      model: z.string().optional(), // allow per-request override (optional)
    });

    const { text, channels, model } = ReqSchema.parse(await req.json());

    const toolIds = Object.values(TOOL_REGISTRY).map(t => t.id);

    const llm = getLLM();
    const completion = await llm.chat.completions.create({
      model: model || LLM_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt(toolIds) },
        { role: "user",   content: userPrompt(text, channels) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = stripCodeFences(raw);

    let json: unknown;
    try {
      json = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "LLM did not return valid JSON." }, { status: 502 });
    }

    // 2) Zod-validate & normalize each agent entry
    const parsed = SpecFileSchema.parse(json);
    const normalised = Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [k, normaliseAgentSpec(v)])
    );

    // 3) Persist to a fresh run dir so /api/generate can consume it
    const runId  = randomUUID();
    const runDir = path.resolve(process.cwd(), ".runs", runId);
    await fs.mkdir(runDir, { recursive: true });

    await fs.writeFile(path.join(runDir, "requirements.raw.json"), cleaned, "utf-8");
    await fs.writeFile(path.join(runDir, "requirements.json"), JSON.stringify(normalised, null, 2), "utf-8");

    return NextResponse.json({ runId, spec: normalised });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Specify failed" }, { status: 500 });
  }
}

export async function HEAD() {
  return new Response(null, { status: 204 });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Allow": "POST,HEAD,OPTIONS",
      "Access-Control-Allow-Methods": "POST,HEAD,OPTIONS",
    },
  });
}