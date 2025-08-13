// app/api/runs/[id]/route.ts (or the tree endpoint)
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { getRunsDir } from "@/utils";
import { buildTree } from "@/utils/fsTree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json({ error: "Missing run id" }, { status: 400 });
  }

  const baseDir = path.resolve(getRunsDir(), id, "generated-templates");

  try {
    const tree = await buildTree(baseDir, "");
    return NextResponse.json(tree, { headers: { "cache-control": "no-store" } });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to read tree" },
      { status: 500 }
    );
  }
}