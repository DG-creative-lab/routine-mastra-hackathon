// app/api/runs/[id]/tree/route.ts
import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import { getRunsDir } from "@/utils";
import { buildTree } from "@/utils/fsTree";

export const runtime = "nodejs";

// Next 15: params is a Promise
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params; // ✅ await params
  if (!id) {
    return NextResponse.json({ error: "Missing run id" }, { status: 400 });
  }

  const baseDir = path.resolve(getRunsDir(), id, "generated-templates");

  try {
    // ✅ If the directory doesn't exist yet (spec created but not generated),
    // return an empty tree instead of 500.
    let exists = false;
    try {
      await fs.stat(baseDir);
      exists = true;
    } catch (e: any) {
      if (e?.code !== "ENOENT") throw e;
    }

    if (!exists) {
      const empty = { name: "generated-templates", path: "", type: "dir", children: [] };
      return NextResponse.json(empty);
    }

    const tree = await buildTree(baseDir, "");
    return NextResponse.json(tree);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to read tree" },
      { status: 500 }
    );
  }
}