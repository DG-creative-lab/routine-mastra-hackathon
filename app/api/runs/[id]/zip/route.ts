import path from "node:path";
import { Readable as NodeReadable } from "node:stream";
import { zipDirToStream } from "@/utils";
import { getRunsDir } from "@/utils";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const runId = params.id;
  const runDir = path.join(getRunsDir(), runId, "generated-templates");

  let nodeZipStream: import("node:stream").Readable;
  try {
    nodeZipStream = zipDirToStream(runDir); // returns a Node Readable
  } catch (err: any) {
    console.error(err);
    return Response.json(
      { error: err?.message ?? "Failed to create ZIP" },
      { status: 500 }
    );
  }

  const webStream = NodeReadable.toWeb(nodeZipStream) as unknown as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${runId}.zip"`,
    },
  });
}