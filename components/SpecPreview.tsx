"use client";

import { useMemo, useState } from "react";
import type { FsNode } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { putArtifacts } from "@/lib/artifacts-cache";
import { postGenerateReuse } from "@/lib/api"; // ✅ correct import

type Props = {
  runId?: string;
  spec?: unknown;
  onGenerated?: (res: { runId: string; tree: FsNode }) => void;
  className?: string;
};

export default function SpecPreview({ runId, spec, onGenerated, className }: Props) {
  const [generating, setGenerating] = useState(false);

  const pretty = useMemo(() => {
    if (!spec) return "";
    try {
      return JSON.stringify(spec, null, 2);
    } catch {
      return String(spec);
    }
  }, [spec]);

  async function handleGenerate() {
    if (!runId || !spec) {
      toast.error("Nothing to generate yet", {
        description: "Create a spec first in the Describe task card.",
      });
      return;
    }
    setGenerating(true);
    try {
      // Your API expects just the runId to reuse the already-specified spec.
      // It returns at least { runId, tree }; some builds also include { files }.
      const res = await postGenerateReuse({ runId });

      // If your backend returns inlined files, stash them for instant preview.
      // Safe no-op if res.files is undefined.
      // @ts-expect-error — tolerate optional files in different backends
      if (res?.files) putArtifacts(res.runId, { tree: res.tree as FsNode, files: res.files });

      onGenerated?.({ runId: res.runId, tree: res.tree as FsNode });
      toast.success("Templates generated");
    } catch (e: any) {
      toast.error("Generation failed", { description: String(e?.message ?? e) });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card className={`rounded-2xl shadow-sm h-full ${className ?? ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Spec preview</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {!spec ? (
          <div className="text-sm text-muted-foreground">
            No spec yet. Create or upload one to see it here.
          </div>
        ) : (
          <>
            <div className="rounded-xl border bg-slate-50 p-3 max-h-[420px] overflow-auto">
              <pre className="text-xs whitespace-pre-wrap">{pretty}</pre>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                Run: <span className="font-mono">{runId ?? "—"}</span>
              </div>
              <Button onClick={handleGenerate} disabled={generating || !runId || !spec}>
                {generating ? "Generating…" : "Generate"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
