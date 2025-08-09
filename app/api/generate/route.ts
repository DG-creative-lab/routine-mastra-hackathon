// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { parseSpec } from "@/parser";
import { makeAgentSpecs, flattenToRoutinePlan } from "@/meta-planner";
import { buildFromPlan } from "@/template-builder";
import { buildTree } from "@/utils";

// keep fully dynamic
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    // 1) requirements.json (mandatory)
    const file = form.get("requirements") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing requirements file" }, { status: 400 });
    }
    const rawJson = await file.text();

    // 2) optional key/value overrides for .env.example (as JSON)
    let vars: Record<string, any> = {};
    const varsRaw = form.get("variables");
    if (typeof varsRaw === "string" && varsRaw.trim()) {
      try {
        vars = JSON.parse(varsRaw);
      } catch {
        return NextResponse.json(
          { error: 'Variables must be valid JSON (e.g. {"GA4_PROPERTY_ID":"123"})' },
          { status: 400 }
        );
      }
    }

    // 3) create run dir
    const runId = randomUUID();
    const runDir = path.resolve(process.cwd(), ".runs", runId);
    await fs.mkdir(runDir, { recursive: true });

    // 4) persist originals
    await fs.writeFile(path.join(runDir, "requirements.json"), rawJson, "utf-8");
    await fs.writeFile(path.join(runDir, "variables.json"), JSON.stringify(vars, null, 2), "utf-8");

    // 5) parse + normalise into CanonicalSpec[]
    let rawObj: unknown;
    try {
      rawObj = JSON.parse(rawJson);
    } catch {
      return NextResponse.json({ error: "requirements.json is not valid JSON." }, { status: 400 });
    }

    // parseSpec returns a map { id -> spec }; turn into array { id, ... }
    const specMap = await parseSpec(rawObj as any);
    const canonicalArr = Object.entries(specMap).map(([id, rest]) => ({ id, ...(rest as object) }));

    // 6) meta-planner → agent specs → Routine plan
    const agentOut = await makeAgentSpecs(canonicalArr); // { agent_specs: [...] }
    const plan = flattenToRoutinePlan(agentOut);         // RoutineStep[]

    // 7) write debug artifacts
    await fs.writeFile(path.join(runDir, "agents.json"), JSON.stringify(agentOut, null, 2), "utf-8");
    await fs.writeFile(path.join(runDir, "plan.json"), JSON.stringify(plan, null, 2), "utf-8");

    // 8) scaffold template (builder will also emit critics.ts / observer.ts if present in agentOut)
    const outDir = path.join(runDir, "generated-templates");
    await buildFromPlan({
      plan,
      agentSpecs: agentOut,
      outDir,
      title: "generated-from-ui",
    });

    // 9) emit .env.example (from UI vars)
    if (Object.keys(vars).length) {
      const envExample = Object.entries(vars)
        .map(([k, v]) => `${k}=${v ?? ""}`)
        .join("\n");
      await fs.writeFile(path.join(outDir, ".env.example"), envExample, "utf-8");
    }

    // 10) return file tree for UI
    const tree = await buildTree(outDir, outDir);
    return NextResponse.json({ runId, tree });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Generation failed" },
      { status: 500 }
    );
  }
}