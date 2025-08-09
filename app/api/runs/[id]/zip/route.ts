import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { zipDirToStream } from '@/utils/zip';

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const runId = params.id;

  // Compute the directory to zip
  const runDir = path.resolve(
    process.cwd(),
    '.runs',
    runId,
    'generated-templates'
  );

  let zipStream;
  try {
    zipStream = zipDirToStream(runDir);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Failed to create ZIP' },
      { status: 500 }
    );
  }

  // Send the ZIP stream as attachment
  return new NextResponse(zipStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${runId}.zip"`,
    },
  });
}