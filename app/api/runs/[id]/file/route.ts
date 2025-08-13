// app/api/runs/[id]/file/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import { getRunsDir } from "@/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Treat only these as text-previewable. Everything else returns 415.
const TEXT_EXT = new Set([
  ".json", ".md", ".txt",
  ".ts", ".tsx", ".js", ".jsx",
  ".css", ".scss", ".sass",
  ".yml", ".yaml", ".toml",
  ".graphql", ".gql"
]);

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const relPath = url.searchParams.get("path");

  if (!id || !relPath) {
    return NextResponse.json({ error: "Missing id or path" }, { status: 400 });
  }

  // Normalize to avoid directory traversal
  const normalized = path.posix.normalize(relPath);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const baseDir = path.resolve(getRunsDir(), id, "generated-templates");
  const fullPath = path.join(baseDir, normalized);

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 404 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    if (!TEXT_EXT.has(ext)) {
      // Not a text file we preview. Return 415; UI can show a small note.
      return NextResponse.json(
        { error: "Unsupported file type for preview.", ext },
        { status: 415 }
      );
    }

    const text = await fs.readFile(fullPath, "utf8");
    const contentType =
      ext === ".json"
        ? "application/json; charset=utf-8"
        : "text/plain; charset=utf-8";

    return new NextResponse(text, {
      headers: {
        "content-type": contentType,
        "cache-control": "no-store"
      }
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to read file" },
      { status: 500 }
    );
  }
}
