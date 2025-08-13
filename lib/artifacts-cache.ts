// lib/artifacts-cache.ts
import type { FsNode } from "@/lib/types";

export type CachedFile = { content: string; contentType: string };
export type RunArtifacts = {
  tree: FsNode;
  files: Record<string, CachedFile>; // key = relative path
};

const cache = new Map<string, RunArtifacts>();

export function putArtifacts(runId: string, artifacts: RunArtifacts) {
  cache.set(runId, artifacts);
}

export function getTree(runId: string): FsNode | undefined {
  return cache.get(runId)?.tree;
}

export function getFile(runId: string, path: string): CachedFile | undefined {
  return cache.get(runId)?.files[path];
}