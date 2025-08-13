import { NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import path from 'node:path';
import { getRunsDir } from '@/utils';
import { zipDirToStream } from '@/utils';

export const runtime = 'nodejs';

type Ctx = { params: { id: string } };

export async function GET(_request: Request, context: Ctx) {
  const { id } = context.params;

  const dir = path.resolve(getRunsDir(), id, 'generated-templates');

  let nodeZipStream: import('node:stream').Readable;
  try {
    nodeZipStream = zipDirToStream(dir); // your util returns a Node Readable
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? 'Failed to create ZIP' },
      { status: 500 }
    );
  }

  const webStream = Readable.toWeb(nodeZipStream) as unknown as ReadableStream;

  return new Response(webStream, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${id}.zip"`,
    },
  });
}