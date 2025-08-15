// app/page.tsx
"use client";

import { useMemo, useState } from "react";
import PromptForm from "@/components/PromptForm";
import ToolCatalog from "@/components/ToolCatalog";
import SpecPreview from "@/components/SpecPreview";
import UploadSpec from "@/components/UploadSpec";
import ResultsExplorer from "@/components/ResultsExplorer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Channel, FsNode } from "@/lib/types";
import ExamplesCard from "@/components/ExamplesCard";
import { postSpecify } from "@/lib/api";
import { toast } from "sonner";

export default function Page() {
  const [runId, setRunId] = useState<string | undefined>();
  const [spec, setSpec]   = useState<unknown | undefined>();
  const [tree, setTree]   = useState<FsNode | undefined>();
  const [selectedChannels] = useState<Channel[]>([]);
  const [promptText, setPromptText] = useState("");

  const hintChannels = useMemo(() => selectedChannels, [selectedChannels]);

  const onSpecified = (res: { runId: string; spec: unknown }) => {
    setRunId(res.runId);
    setSpec(res.spec);
    setTree(undefined);
  };

  const onGenerated = (res: { runId: string; tree: FsNode }) => {
    setRunId(res.runId);
    setTree(res.tree);
  };

  // NEW: Preview an example PROMPT by calling /api/specify
  async function previewPrompt(text: string, channels?: string[]) {
    try {
      const res = await postSpecify({ text, channels });
      setPromptText(text);       // optional: fill the prompt area
      setRunId(res.runId);
      setSpec(res.spec);
      setTree(undefined);
    } catch (e: any) {
      toast.error("Preview failed", { description: String(e?.message ?? e) });
    }
  }

  // Optional: when previewing a raw JSON spec, give it a local run id
  function previewSpecLocal(s: unknown) {
    setRunId(crypto.randomUUID());
    setSpec(s);
    setTree(undefined);
  }

  return (
    <section className="space-y-4">
      <Tabs defaultValue="describe">
        <TabsList className="bg-muted p-1 rounded-lg w-fit">
          <TabsTrigger value="describe">Describe task</TabsTrigger>
          <TabsTrigger value="upload">Upload spec</TabsTrigger>
        </TabsList>

        <TabsContent value="describe" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:items-stretch">
            <div className="flex flex-col">
              <PromptForm
                text={promptText}
                setText={setPromptText}
                onSpecified={onSpecified}
                className="h-full"
              />
            </div>

            <div className="flex flex-col">
              <SpecPreview runId={runId} spec={spec} onGenerated={onGenerated} className="h-full" />
            </div>

            <div className="flex flex-col">
              <ResultsExplorer runId={runId} initialTree={tree} className="h-full" />
            </div>

            <div className="lg:col-span-3">
              <ToolCatalog
                selectedChannels={hintChannels}
                onInsertTool={(tool) =>
                  setPromptText((t) => (t ? `${t}\nUse tool: ${tool.id}` : `Use tool: ${tool.id}`))
                }
              />
              <ExamplesCard
                onPreviewPrompt={previewPrompt}
                onPreviewSpec={previewSpecLocal}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:items-stretch">
            <div className="flex flex-col">
              <UploadSpec onGenerated={onGenerated} onPreviewSpec={(s) => setSpec(s)} />
            </div>
            <div className="flex flex-col">
              <SpecPreview runId={runId} spec={spec} onGenerated={onGenerated} className="h-full" />
            </div>
            <div className="flex flex-col">
              <ResultsExplorer runId={runId} initialTree={tree} className="h-full" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}