import { promises as fs } from "fs";
import path from "path";

export type TreeNode = { name: string; path: string; type: "file" | "dir"; children?: TreeNode[] };

export async function buildTree(root: string, base: string): Promise<TreeNode> {
  const stat = await fs.lstat(root);
  const node: TreeNode = { name: path.basename(root), path: path.relative(base, root), type: stat.isDirectory() ? "dir" : "file" };
  if (stat.isDirectory()) {
    const items = await fs.readdir(root);
    node.children = await Promise.all(items.map((i) => buildTree(path.join(root, i), base)));
  }
  return node;
}