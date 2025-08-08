// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { parseSpec } from "@/src/parser";
import { categoriseWithLLM, buildRoutinePlan } from "@/src/meta-planner";
import { buildFromPlan } from "@/src/template-builder/scaffolder";
import { buildTree } from "@/src/utils/fsTree";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    // 1) read uploaded requirements file
    const file = form.get("requirements") as File | null;
    if (!file) return NextResponse.json({ error: "Missing requirements file" }, { status: 400 });

    const rawJson = await file.text();

    // 2) read variables (env overrides) from form
    const vars = JSON.parse((form.get("variables") as string | null) ?? "{}");

    // 3) create run folder
    const runId = randomUUID();
    const runDir = path.resolve(process.cwd(), ".runs", runId);
    await fs.mkdir(runDir, { recursive: true });

    // 4) persist inputs (for reproducibility)
    await fs.writeFile(path.join(runDir, "agents_spec.json"), rawJson, "utf-8");
    await fs.writeFile(path.join(runDir, "variables.json"), JSON.stringify(vars, null, 2), "utf-8");

    // 5) Parser → Planner → Plan
    const spec = parseSpec(rawJson);                 // your zod-normalized CanonicalSpec[]
    const buckets = await categoriseWithLLM(spec);   // planner/executor/critic/tools IDs
    const plan = buildRoutinePlan(buckets);          // Routine steps array
    await fs.writeFile(path.join(runDir, "plan.json"), JSON.stringify(plan, null, 2), "utf-8");

    // 6) Scaffold templates from plan
    const outDir = path.join(runDir, "generated-templates");
    await buildFromPlan({ plan, outDir, name: "generated-from-ui" });

    // 7) Optionally inject a .env based on variables the user entered
    const envExample = Object.entries(vars)
      .map(([k, v]) => `${k}=${v ?? ""}`)
      .join("\n");
    await fs.writeFile(path.join(outDir, ".env.example"), envExample, "utf-8");

    // 8) Return runId + file tree
    const tree = await buildTree(outDir, outDir); // relative tree
    return NextResponse.json({ runId, tree });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message ?? "Generation failed" }, { status: 500 });
  }
}