"use client";

import { useEffect, useMemo, useState } from "react";
import type { FsNode } from "@/lib/types";
import { fetchFile, fetchRunTree } from "@/lib/api";
import { getTree as getCachedTree, getFile as getCachedFile } from "@/lib/artifacts-cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { File as FileIcon, Folder } from "lucide-react";
import { toast } from "sonner";

type Props = {
  runId?: string;
  initialTree?: FsNode;
  className?: string;
};

export default function ResultsExplorer({ runId, initialTree, className }: Props) {
  const [tree, setTree] = useState<FsNode | undefined>(initialTree);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingFile, setLoadingFile] = useState(false);

  // Prefer cached tree (from generate), then fallback fetch
  useEffect(() => {
    if (!runId) return;
    const cached = getCachedTree(runId);
    if (cached) {
      setTree(cached);
      return;
    }
    fetchRunTree(runId).then(setTree).catch(() => {});
  }, [runId]);

  const badges = useMemo(() => {
    let hasCritics = false;
    let hasObserver = false;
    function walk(n?: FsNode) {
      if (!n) return;
      if (n.type === "file") {
        if (n.name === "critics.ts") hasCritics = true;
        if (n.name === "observer.ts") hasObserver = true;
      }
      n.children?.forEach(walk);
    }
    walk(tree);
    return { hasCritics, hasObserver };
  }, [tree]);

  async function openFile(path: string) {
    if (!runId) return;
    setLoadingFile(true);
    try {
      // 1) try cache
      const cached = getCachedFile(runId, path);
      if (cached) {
        setFileContent(cached.content);
        setSelectedPath(path);
        return;
      }
      // 2) fallback to API (dev/local)
      const res = await fetchFile(runId, path);
      if (res.type === "text") {
        setFileContent(res.content);
      } else {
        setFileContent(`(binary: ${res.contentType})`);
      }
      setSelectedPath(path);
    } catch (e) {
      toast.error("Failed to open file", { description: String(e) });
    } finally {
      setLoadingFile(false);
    }
  }

  return (
    <Card className={`rounded-2xl shadow-sm h-full min-h-[240px] ${className ?? ""}`}>
      <CardHeader className="pb-3 flex items-center justify-between">
        <CardTitle className="text-base">Results</CardTitle>
        <div className="flex items-center gap-2">
          {badges.hasCritics && <Badge variant="secondary">critics.ts</Badge>}
          {badges.hasObserver && <Badge variant="secondary">observer.ts</Badge>}
          {/* ZIP download button intentionally hidden for now */}
        </div>
      </CardHeader>
      <CardContent className="pt-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ScrollArea className="max-h-[420px] rounded-xl border p-2">
          {!tree ? (
            <div className="p-2 text-sm text-muted-foreground">No files yet.</div>
          ) : (
            <div className="text-sm">
              <TreeNode
                node={tree}
                depth={0}
                onOpen={openFile}
                activePath={selectedPath}
              />
            </div>
          )}
        </ScrollArea>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-white/10 bg-transparent p-3 max-h-[420px] overflow-auto">
            {!selectedPath ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted-foreground">
                Select a file to preview.
              </div>
            ) : loadingFile ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-muted-foreground">
                Loading file…
              </div>
            ) : (
              <>
                <div className="mb-2 text-xs text-slate-500">
                  <span className="font-mono">{selectedPath}</span>
                </div>
                <Separator className="mb-3" />
                <pre className="text-xs whitespace-pre-wrap">{fileContent}</pre>
              </>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Run: <span className="font-mono">{runId ?? "—"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TreeNode({
  node,
  depth,
  onOpen,
  activePath,
}: {
  node: FsNode;
  depth: number;
  onOpen: (path: string) => void;
  activePath: string;
}) {
  const pad = { paddingLeft: `${depth * 12}px` };
  if (node.type === "file") {
    const active = activePath === node.path;
    return (
      <div
        className={`flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer hover:bg-slate-100 ${
          active ? "bg-slate-100" : ""
        }`}
        style={pad}
        onClick={() => onOpen(node.path)}
      >
        <FileIcon className="h-4 w-4" />
        <span className="font-mono text-xs">{node.name}</span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-2 px-2 py-1" style={pad}>
        <Folder className="h-4 w-4" />
        <span className="font-medium">{node.name}</span>
      </div>
      {node.children?.map((c) => (
        <TreeNode
          key={c.path}
          node={c}
          depth={depth + 1}
          onOpen={onOpen}
          activePath={activePath}
        />
      ))}
    </div>
  );
}



