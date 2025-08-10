import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { parseSpec } from "@/parser";
import { makeAgentSpecs, flattenToRoutinePlan } from "@/meta-planner";
import { buildFromPlan } from "@/template-builder";
import { buildTree } from "@/utils";
import type { CanonicalSpec } from "@/types/canonical";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const file = form.get("requirements") as File | null;
    if (!file) return NextResponse.json({ error: "Missing requirements file" }, { status: 400 });
    const rawJson = await file.text();

    let vars: Record<string, any> = {};
    const varsRaw = form.get("variables");
    if (typeof varsRaw === "string" && varsRaw.trim()) {
      try { vars = JSON.parse(varsRaw); }
      catch { return NextResponse.json({ error: 'Variables must be valid JSON (e.g. {"GA4_PROPERTY_ID":"123"})' }, { status: 400 }); }
    }

    const runId  = randomUUID();
    const runDir = path.resolve(process.cwd(), ".runs", runId);
    await fs.mkdir(runDir, { recursive: true });

    await fs.writeFile(path.join(runDir, "requirements.json"), rawJson, "utf-8");
    await fs.writeFile(path.join(runDir, "variables.json"), JSON.stringify(vars, null, 2), "utf-8");

    let rawObj: unknown;
    try { rawObj = JSON.parse(rawJson); }
    catch { return NextResponse.json({ error: "requirements.json is not valid JSON." }, { status: 400 }); }

    // parseSpec → Record<string, Omit<CanonicalSpec, "id">>
    const specMap = await parseSpec(rawObj as any);
    const canonicalArr = Object.entries(specMap).map(
      ([id, rest]) => ({ id, ...(rest as object) } as CanonicalSpec)
    );

    // Meta-planner → agent specs → Routine plan
    const agentOut = await makeAgentSpecs(canonicalArr);   // infer PlannerOutput
    const plan     = flattenToRoutinePlan(agentOut);       // RoutineStep[]

    await fs.writeFile(path.join(runDir, "agents.json"), JSON.stringify(agentOut, null, 2), "utf-8");
    await fs.writeFile(path.join(runDir, "plan.json"),   JSON.stringify(plan,     null, 2), "utf-8");

    const outDir = path.join(runDir, "generated-templates");
    await buildFromPlan({ plan, agentSpecs: agentOut, outDir, title: "generated-from-ui" });

    if (Object.keys(vars).length) {
      const envExample = Object.entries(vars).map(([k, v]) => `${k}=${v ?? ""}`).join("\n");
      await fs.writeFile(path.join(outDir, ".env.example"), envExample, "utf-8");
    }

    const tree = await buildTree(outDir, outDir);
    return NextResponse.json({ runId, tree });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Generation failed" }, { status: 500 });
  }
}