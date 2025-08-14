import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import { getRunsDir } from "@/utils";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: any) {
  // Pull run id from route params (do not annotate ctx to dodge the plugin)
  const id = ctx?.params?.id as string | undefined;
  const url = new URL(req.url);
  const relPath = url.searchParams.get("path") ?? "";

  if (!id) {
    return NextResponse.json({ error: "Missing run id" }, { status: 400 });
  }
  if (!relPath) {
    return NextResponse.json({ error: "Missing `path` query parameter" }, { status: 400 });
  }

  // prevent directory traversal
  const normalized = path.posix.normalize(relPath);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return NextResponse.json({ error: "Invalid `path` parameter" }, { status: 400 });
  }

  // absolute file path
  const fullPath = path.resolve(getRunsDir(), id, "generated-templates", normalized);

  // read the file as text; if that fails, return a simple JSON saying it's binary
  try {
    const content = await fs.readFile(fullPath, "utf8");
    // text preview
    return new Response(content, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch {
    // Fall back for non-text files
    return NextResponse.json(
      { error: "Binary or unreadable as text" },
      { status: 415 } // Unsupported Media Type
    );
  }
}