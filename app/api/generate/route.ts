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

const RUN_ID_RX = /^[0-9a-f-]{36}$/i;
async function readIfExists(p: string) {
  try { return await fs.readFile(p, "utf-8"); } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";

    let runId: string;
    let rawJson: string;                        // requirements.json contents
    let vars: Record<string, any> = {};         // optional variables for .env.example
    let title = "generated-from-ui";

    if (ct.includes("multipart/form-data")) {
      // ---- Path A: old behavior (file upload) ------------------------------
      const form = await req.formData();

      const file = form.get("requirements") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Missing requirements file" }, { status: 400 });
      }
      rawJson = await file.text();

      const varsRaw = form.get("variables");
      if (typeof varsRaw === "string" && varsRaw.trim()) {
        try { vars = JSON.parse(varsRaw); }
        catch { return NextResponse.json({ error: 'Variables must be valid JSON (e.g. {"GA4_PROPERTY_ID":"123"})' }, { status: 400 }); }
      }

      runId = randomUUID();
      const runDir = path.resolve(process.cwd(), ".runs", runId);
      await fs.mkdir(runDir, { recursive: true });
      await fs.writeFile(path.join(runDir, "requirements.json"), rawJson, "utf-8");
      await fs.writeFile(path.join(runDir, "variables.json"), JSON.stringify(vars, null, 2), "utf-8");
    } else {
      // ---- Path B: JSON body { runId } (produced by /api/specify) ----------
      const body = await req.json().catch(() => null) as
        | { runId?: string; title?: string; variables?: Record<string, any> }
        | null;

      if (!body || !body.runId) {
        return NextResponse.json(
          { error: "Provide FormData with 'requirements' file OR JSON { runId }." },
          { status: 400 }
        );
      }

      if (!RUN_ID_RX.test(body.runId)) {
        return NextResponse.json({ error: "Invalid runId format." }, { status: 400 });
      }

      runId = body.runId;
      title = body.title ?? title;

      const runDir = path.resolve(process.cwd(), ".runs", runId);
      const reqPath = path.join(runDir, "requirements.json");
      const reqText = await readIfExists(reqPath);
      if (!reqText) {
        return NextResponse.json({ error: `requirements.json not found for runId ${runId}` }, { status: 404 });
      }
      rawJson = reqText;

      // variables: prefer provided override, else read saved variables.json if present
      vars = body.variables ?? (await (async () => {
        const v = await readIfExists(path.join(runDir, "variables.json"));
        try { return v ? JSON.parse(v) : {}; } catch { return {}; }
      })());
    }

    // ---- Common path: parse spec → plan → scaffold --------------------------
    let rawObj: unknown;
    try { rawObj = JSON.parse(rawJson); }
    catch { return NextResponse.json({ error: "requirements.json is not valid JSON." }, { status: 400 }); }

    const specMap = await parseSpec(rawObj as any);
    const canonicalArr: CanonicalSpec[] = Object.entries(specMap).map(
      ([id, rest]) => ({ id, ...(rest as object) } as CanonicalSpec)
    );

    const agentOut = await makeAgentSpecs(canonicalArr);   // { agent_specs: [...] }
    const plan     = flattenToRoutinePlan(agentOut);       // RoutineStep[]

    const runDir = path.resolve(process.cwd(), ".runs", runId);
    await fs.writeFile(path.join(runDir, "agents.json"), JSON.stringify(agentOut, null, 2), "utf-8");
    await fs.writeFile(path.join(runDir, "plan.json"),   JSON.stringify(plan,     null, 2), "utf-8");

    const outDir = path.join(runDir, "generated-templates");
    await buildFromPlan({ plan, agentSpecs: agentOut, outDir, title });

    if (Object.keys(vars).length) {
      const envExample = Object.entries(vars).map(([k, v]) => `${k}=${v ?? ""}`).join("\n");
      await fs.writeFile(path.join(outDir, ".env.example"), envExample, "utf-8");
    }

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