import { NextRequest } from "next/server";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable as NodeReadable } from "node:stream";
import { getRunsDir } from "@/utils";

export const runtime = "nodejs"; // we use Node fs/streams

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const runId = params.id;
  const relPath = req.nextUrl.searchParams.get("path");

  if (!relPath) {
    return Response.json({ error: "Missing `path` query parameter" }, { status: 400 });
  }

  // guard traversal
  const normalized = path.posix.normalize(relPath);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return Response.json({ error: "Invalid `path` parameter" }, { status: 400 });
  }

  // file path under .runs/{id}/generated-templates
  const runDir = path.join(getRunsDir(), runId, "generated-templates");
  const fullPath = path.join(runDir, normalized);

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) throw new Error("Not a file");
  } catch {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  const nodeStream = createReadStream(fullPath);
  // Convert Node stream -> Web stream (use global ReadableStream)
  const webStream = NodeReadable.toWeb(nodeStream) as unknown as ReadableStream;

  const fileName = path.basename(fullPath);
  return new Response(webStream, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/octet-stream",
    },
  });
}