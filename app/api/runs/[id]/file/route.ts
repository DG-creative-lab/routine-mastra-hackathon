import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, promises as fsPromises } from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const runId = params.id;
  const url   = req.nextUrl;
  const relPath = url.searchParams.get('path');

  if (!relPath) {
    return NextResponse.json(
      { error: 'Missing `path` query parameter' },
      { status: 400 }
    );
  }

  // Prevent directory traversal & absolute paths
  const normalized = path.posix.normalize(relPath);
  if (
    normalized.startsWith('..') ||
    path.isAbsolute(normalized)
  ) {
    return NextResponse.json(
      { error: 'Invalid `path` parameter' },
      { status: 400 }
    );
  }

  // Compute full path under this run
  const runDir   = path.resolve(process.cwd(), '.runs', runId, 'generated-templates');
  const fullPath = path.join(runDir, normalized);

  // Make sure the file exists and is a file
  try {
    const stat = await fsPromises.stat(fullPath);
    if (!stat.isFile()) {
      throw new Error('Not a file');
    }
  } catch {
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }

  // Stream the file back as an attachment
  const fileName = path.basename(fullPath);
  const stream   = createReadStream(fullPath);

  return new NextResponse(stream, {
    headers: {
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Type':        'application/octet-stream',
    }
  });
}