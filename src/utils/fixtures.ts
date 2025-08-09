import * as fs from "fs/promises";
import path from "path";

const FIXTURES_ROOT = path.join(process.cwd(), "src", "fixtures");

export async function loadFixture(toolId: string, name = "baseline") {
  const p = path.join(FIXTURES_ROOT, toolId, `${name}.json`);
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw);
}

export async function listFixtureNames(toolId: string): Promise<string[]> {
  const dir = path.join(FIXTURES_ROOT, toolId);
  const files = await fs.readdir(dir).catch(() => []);
  return files
    .filter(f => f.endsWith(".json"))
    .map(f => f.replace(/\.json$/, ""));
}