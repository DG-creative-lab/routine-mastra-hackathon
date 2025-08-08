import { NextRequest, NextResponse } from "next/server";
import { buildTree } from "@/src/utils/fsTree";
import path from "path";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const runDir = path.resolve(process.cwd(), ".runs", params.id, "generated-templates");
  const tree = await buildTree(runDir, runDir);
  return NextResponse.json({ tree });
}