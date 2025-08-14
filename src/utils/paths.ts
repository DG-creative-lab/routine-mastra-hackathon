import path from "path";

export function getRunsDir() {
  return process.env.RUNS_DIR || path.resolve(process.cwd(), ".runs");
}