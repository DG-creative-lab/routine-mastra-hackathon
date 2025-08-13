import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { Readable } from "node:stream";          
import { zipDirToStream } from "@/utils/zip";

/**
 * Convert whatever we got (Node Readable or Web ReadableStream)
 * into a Web ReadableStream suitable for NextResponse.
 */
function asWebStream(s: unknown): ReadableStream {
  // Web streams have getReader()
  if (s && typeof (s as any).getReader === "function") {
    return s as ReadableStream;
  }
  // Otherwise assume Node.js readable and convert
  return Readable.toWeb(s as any) as unknown as ReadableStream;
}

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const runId = params.id;

  const runDir = path.resolve(
    process.cwd(),
    ".runs",
    runId,
    "generated-templates"
  );

  let rawStream: unknown;
  try {
    rawStream = zipDirToStream(runDir); // could be Node Readable or Web ReadableStream
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message || "Failed to create ZIP" },
      { status: 500 }
    );
  }

  const webStream = asWebStream(rawStream);

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${runId}.zip"`,
    },
  });
}