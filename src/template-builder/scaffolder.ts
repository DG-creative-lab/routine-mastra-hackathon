// =============================================================
// Production-ready scaffolder for Meta-Template Builder
// - Takes a Routine plan and optional toolBindings, name
// - Generates a Mastra template folder: plan.json, nodes.ts, workflow.ts, critics.ts, register.ts, README.md
// - Returns the list of output file paths
// =============================================================

import * as fs from "fs/promises";
import path from "path";
import { logger } from "../utils/logger";
import {
  file_planJson,
  file_nodesTs,
  file_workflowTs,
  file_criticsTs,
  file_registerTs,
  file_readmeMd,
} from "./scaffolders";
import type { RoutineStep } from "../types/cannonical";
import type { ToolBinding } from "./types";

/**
 * Arguments for the scaffolder
 */
export interface BuildFromPlanArgs {
  /**
   * The Routine plan array to scaffold from
   */
  plan: RoutineStep[];

  /**
   * Output directory; will be created (recursive) if it does not exist
   */
  outDir: string;

  /**
   * Human-readable name used in the README title
   */
  name?: string;

  /**
   * Tool bindings to import in workflow.ts
   */
  toolBindings?: ToolBinding[];
}

/**
 * Scaffolds a Mastra template folder from a Routine plan
 *
 * @param args.plan          RoutineStep[]
 * @param args.outDir        output folder for generated files
 * @param args.name          title string for README.md
 * @param args.toolBindings  list of tools to wire into workflow.ts
 * @returns Promise<string[]> list of absolute file paths written
 */
export async function buildFromPlan({
  plan,
  outDir,
  name = "Generated Template",
  toolBindings = [],
}: BuildFromPlanArgs): Promise<string[]> {
  logger.info("Starting scaffold of template to %s", outDir);

  // 1) ensure output directory exists
  await fs.mkdir(outDir, { recursive: true });

  // 2) prepare content for each file in the proper order
  const entries: Array<{ filename: string; content: string }> = [
    { filename: "plan.json",   content: file_planJson(JSON.stringify(plan, null, 2)) },
    { filename: "nodes.ts",    content: file_nodesTs(plan) },
    { filename: "workflow.ts", content: file_workflowTs(plan, toolBindings) },
    { filename: "critics.ts",  content: file_criticsTs() },
    { filename: "register.ts", content: file_registerTs() },
    { filename: "README.md",   content: file_readmeMd(name) },
  ];

  // 3) write all files to disk
  const writePromises = entries.map(async ({ filename, content }) => {
    const filePath = path.join(outDir, filename);
    logger.debug("Writing %s", filePath);
    await fs.writeFile(filePath, content, "utf-8");
    return filePath;
  });

  const writtenPaths = await Promise.all(writePromises);

  logger.info("Scaffolding complete: %d files generated", writtenPaths.length);
  return writtenPaths;
}
