import { NextResponse } from "next/server";
import path from "node:path";
import { getRunsDir } from "@/utils";
// re-use your existing util that returns a Node Readable
import { zipDirToStream } from "@/utils/zip";

export const runtime = "nodejs";

export async function GET(_req: Request, context: any) {
  const { id } = (context?.params ?? {}) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "Missing run id" }, { status: 400 });
  }

  const dir = path.resolve(getRunsDir(), id, "generated-templates");

  let nodeStream: NodeJS.ReadableStream;
  try {
    nodeStream = zipDirToStream(dir); // your existing helper
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to create ZIP" },
      { status: 500 }
    );
  }

  // Consume the Node stream fully into a Buffer (still no streaming in the response)
  const chunks: Buffer[] = [];
  for await (const chunk of nodeStream as any) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buf = Buffer.concat(chunks);

  return new Response(buf, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${id}.zip"`,
    },
  });
}