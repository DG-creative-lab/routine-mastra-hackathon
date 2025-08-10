import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { z, ZodError } from "zod";

import { SpecFileSchema } from "@/parser/schema";
import { normaliseAgentSpec } from "@/parser/normalize";

export const dynamic = "force-dynamic";

/**
 * Accepts either:
 *  - JSON body: { spec: <object | string>, persist?: boolean }
 *  - OR a raw JSON object as the body itself (the spec)
 *
 * Returns: { ok, spec, runId? }
 */
export async function POST(req: NextRequest) {
  try {
    // try JSON first; if that fails, fall back to raw text
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      const txt = await req.text();
      try {
        body = JSON.parse(txt);
      } catch {
        return NextResponse.json(
          { error: "Body must be JSON. Either send { spec: {...} } or the spec object directly." },
          { status: 400 }
        );
      }
    }

    // shape: { spec?: unknown, persist?: boolean } | <spec object directly>
    const Envelope = z.object({
      spec: z.unknown(),
      persist: z.boolean().optional(),
    });

    let specUnknown: unknown;
    let persist = false;

    const parsedEnv = Envelope.safeParse(body);
    if (parsedEnv.success) {
      specUnknown = parsedEnv.data.spec;
      persist = Boolean(parsedEnv.data.persist);
    } else {
      // treat the entire body as the spec itself
      specUnknown = body;
    }

    // if spec was a string, parse it
    if (typeof specUnknown === "string") {
      try {
        specUnknown = JSON.parse(specUnknown);
      } catch {
        return NextResponse.json(
          { error: "If 'spec' is a string, it must be valid JSON." },
          { status: 400 }
        );
      }
    }

    // Validate against the SpecFileSchema
    // SpecFileSchema = Record<string, AgentSpec>
    let parsedSpec: z.infer<typeof SpecFileSchema>;
    try {
      parsedSpec = SpecFileSchema.parse(specUnknown);
    } catch (e) {
      const ze = e as ZodError;
      return NextResponse.json(
        {
          error: "Spec validation failed.",
          issues: ze.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
            code: i.code,
          })),
        },
        { status: 422 }
      );
    }

    // Normalize each agent entry
    const normalized = Object.fromEntries(
      Object.entries(parsedSpec).map(([k, v]) => [k, normaliseAgentSpec(v)])
    );

    // Optional: persist to a run dir (so /api/generate can reuse)
    let runId: string | undefined;
    if (persist) {
      runId = randomUUID();
      const runDir = path.resolve(process.cwd(), ".runs", runId);
      await fs.mkdir(runDir, { recursive: true });
      await fs.writeFile(
        path.join(runDir, "requirements.json"),
        JSON.stringify(normalized, null, 2),
        "utf-8"
      );
    }

    return NextResponse.json({ ok: true, spec: normalized, runId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Validate failed" },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  return new Response(null, { status: 204 });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST,HEAD,OPTIONS",
      "Access-Control-Allow-Methods": "POST,HEAD,OPTIONS",
    },
  });
}