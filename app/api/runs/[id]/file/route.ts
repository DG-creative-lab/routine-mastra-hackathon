import { NextResponse } from "next/server";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { getRunsDir } from "@/utils";

export const runtime = "nodejs";

export async function GET(_req: Request, context: any) {
  const { id } = (context?.params ?? {}) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "Missing run id" }, { status: 400 });
  }

  const url = new URL(_req.url);
  const relPath = url.searchParams.get("path");
  if (!relPath) {
    return NextResponse.json({ error: "Missing `path` query parameter" }, { status: 400 });
  }

  // Normalize / guard
  const normalized = path.posix.normalize(relPath);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return NextResponse.json({ error: "Invalid `path` parameter" }, { status: 400 });
  }

  // Resolve file under .runs/{id}/generated-templates
  const baseDir = path.resolve(getRunsDir(), id, "generated-templates");
  const fullPath = path.join(baseDir, normalized);

  // Read as Buffer (no streaming)
  let buf: Buffer;
  try {
    const stat = await fsp.stat(fullPath);
    if (!stat.isFile()) throw new Error("Not a file");
    buf = await fsp.readFile(fullPath);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const filename = path.basename(fullPath);
  return new Response(buf, {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}