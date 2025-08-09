import { NextRequest, NextResponse } from "next/server";
import { buildTree } from "@/utils/fsTree";
import path from "path";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const runDir = path.join(process.cwd(), ".runs", params.id, "generated-templates");
  try {
    const tree = await buildTree(runDir, runDir);
    return NextResponse.json({ tree });
  } catch (err: any) {
    // maybe ENOENT → 404, else 500
    if (err.code === 'ENOENT') {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Failed to read run' }, { status: 500 });
  }
}