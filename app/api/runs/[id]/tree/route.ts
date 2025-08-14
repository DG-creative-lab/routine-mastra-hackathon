import { NextResponse } from "next/server";
import path from "node:path";
import { getRunsDir } from "@/utils";
import { buildTree } from "@/utils/fsTree";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: any) {
  const id = ctx?.params?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ error: "Missing run id" }, { status: 400 });
  }

  const baseDir = path.resolve(getRunsDir(), id, "generated-templates");

  try {
    const tree = await buildTree(baseDir, ""); // pass "" if your buildTree expects 2 args
    return NextResponse.json(tree);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to read tree" },
      { status: 500 }
    );
  }
}