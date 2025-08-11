"use client";

import { useState } from "react";
import { validateSpec, postGenerateReuse } from "@/lib/api";
import type { AgentSpecFile } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clipboard, Download, ShieldCheck, PlayCircle } from "lucide-react";
import { toast } from "sonner";

type Props = {
  runId?: string;
  spec?: AgentSpecFile | unknown;
  onGenerated: (res: { runId: string; tree: any }) => void;
  className?: string;
};

export default function SpecPreview({ runId, spec, onGenerated, className }: Props) {
  const [validating, setValidating] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function onValidate() {
    if (!spec) return;
    setValidating(true);
    try {
      const res = await validateSpec({ object: spec });
      if ("ok" in res && res.ok) {
        toast.success("Spec is valid");
      } else {
        toast.error("Spec invalid", { description: (res as any).error });
      }
    } catch (e) {
      toast.error("Validation error", { description: String(e) });
    } finally {
      setValidating(false);
    }
  }

  async function onGenerate() {
    if (!runId) {
      toast.error("No run to generate");
      return;
    }
    setGenerating(true);
    try {
      const res = await postGenerateReuse({ runId });
      toast.success("Template ready • download or explore files");
      onGenerated(res);
    } catch (e) {
      toast.error("Generate failed", { description: String(e) });
    } finally {
      setGenerating(false);
    }
  }

  function copyJSON() {
    if (!spec) return;
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2));
    toast.success("Spec copied to clipboard");
  }

  function downloadJSON() {
    if (!spec) return;
    const blob = new Blob([JSON.stringify(spec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "requirements.normalized.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className={`rounded-2xl shadow-sm h-full min-h-[240px] ${className ?? ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Spec preview</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!spec ? (
          <div className="text-sm text-muted-foreground">
            No spec yet. Create or upload one to see it here.
          </div>
        ) : (
          <>
            <div className="rounded-xl border bg-slate-50 p-3 max-h-[320px] overflow-auto text-xs">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(spec, null, 2)}
              </pre>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={copyJSON}>
                <Clipboard className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button variant="secondary" onClick={downloadJSON}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={onValidate} disabled={validating}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                {validating ? "Validating…" : "Validate"}
              </Button>
              <Button
                onClick={onGenerate}
                disabled={generating || !runId}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {generating ? "Generating…" : "Generate Template"}
              </Button>
            </div>
            <Separator className="my-3" />
            <div className="text-xs text-muted-foreground">
              Run: <span className="font-mono">{runId ?? "—"}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

