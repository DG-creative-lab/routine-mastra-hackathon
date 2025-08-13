import { NextResponse } from 'next/server';
import { createReadStream, promises as fsp } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
import { getRunsDir } from '@/utils';

export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = params;
  
  // read ?path=... from the URL
  const url = new URL(request.url);
  const relPath = url.searchParams.get('path');
  
  if (!relPath) {
    return NextResponse.json({ error: 'Missing `path` query parameter' }, { status: 400 });
  }
  
  // normalize/sanitize the path
  const normalized = path.posix.normalize(relPath);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    return NextResponse.json({ error: 'Invalid `path` parameter' }, { status: 400 });
  }
  
  // compute full path under this run
  const baseDir = path.resolve(getRunsDir(), id, 'generated-templates');
  const fullPath = path.join(baseDir, normalized);
  
  try {
    const stat = await fsp.stat(fullPath);
    if (!stat.isFile()) throw new Error('Not a file');
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  
  const nodeStream = createReadStream(fullPath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
  const fileName = path.basename(fullPath);
  
  // You can return a plain Response in route handlers
  return new Response(webStream, {
    headers: {
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename="${fileName}"`,
    },
  });
}