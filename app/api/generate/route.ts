import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { parseSpec } from "@/parser";
import { makeAgentSpecs, flattenToRoutinePlan } from "@/meta-planner";
import { buildFromPlan } from "@/template-builder";
import { buildTree } from "@/utils";

// Optional (keeps the route fully dynamic)
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    // 1) Read uploaded requirements file
    const file = form.get("requirements") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "Missing requirements file" },
        { status: 400 }
      );
    }
    const rawJson = await file.text();

    // 2) Parse optional env variables (JSON string)
    let vars: Record<string, any> = {};
    const varsRaw = form.get("variables");
    if (typeof varsRaw === "string" && varsRaw.trim()) {
      try {
        vars = JSON.parse(varsRaw);
      } catch {
        return NextResponse.json(
          { error: "Variables must be valid JSON (e.g., {\"GA4_PROPERTY_ID\":\"123\"})." },
          { status: 400 }
        );
      }
    }

    // 3) Create a new run directory
    const runId = randomUUID();
    const runDir = path.resolve(process.cwd(), ".runs", runId);
    await fs.mkdir(runDir, { recursive: true });

    // 4) Persist inputs for reproducibility
    await fs.writeFile(path.join(runDir, "agents_spec.json"), rawJson, "utf-8");
    await fs.writeFile(path.join(runDir, "variables.json"), JSON.stringify(vars, null, 2), "utf-8");

    // 5) Parse + normalize the spec (returns CanonicalSpec)
    const canonical = await parseSpec(rawJson); // supports raw JSON string
    const canonicalArr = Array.isArray(canonical)
      ? canonical
      : Object.entries(canonical as Record<string, any>).map(([id, rest]) => ({ id, ...(rest as object) }));

    // 6) Meta-planner → sub-agent specs → flatten to Routine plan
    const agentOut = await makeAgentSpecs(canonicalArr);   // { agent_specs: [...] }
    const plan = flattenToRoutinePlan(agentOut);           // RoutineStep[]

    // 7) Write helpful artifacts for debugging
    await fs.writeFile(path.join(runDir, "agents.json"), JSON.stringify(agentOut, null, 2), "utf-8");
    await fs.writeFile(path.join(runDir, "plan.json"), JSON.stringify(plan, null, 2), "utf-8");

    // 8) Scaffold templates into generated-templates/
    const outDir = path.join(runDir, "generated-templates");
    await buildFromPlan({
      plan,                   // inline plan (no need to re-read from disk)
      agentSpecs: agentOut,   // will emit agents.json alongside plan.json
      outDir,
      title: "generated-from-ui",
    });

    // 9) Convenience: .env.example from variables provided in UI
    if (Object.keys(vars).length) {
      const envExample = Object.entries(vars)
        .map(([k, v]) => `${k}=${v ?? ""}`)
        .join("\n");
      await fs.writeFile(path.join(outDir, ".env.example"), envExample, "utf-8");
    }

    // 10) Return file tree for the generated templates
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