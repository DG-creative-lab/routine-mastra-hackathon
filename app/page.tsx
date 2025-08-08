"use client";
import React, { useState } from "react";

type TreeNode = { name: string; path: string; type: "file" | "dir"; children?: TreeNode[] };

export default function Page() {
  const [requirements, setRequirements] = useState<File | null>(null);
  const [variables, setVariables] = useState<string>(JSON.stringify({
    OPENROUTER_API_KEY: "",
    GA4_PROPERTY_ID: "",
    GA4_KEY_FILE: "",
    DV360_ADVERTISER_ID: "",
    META_ACCESS_TOKEN: ""
  }, null, 2));
  const [runId, setRunId] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setError(null);
    if (!requirements) { setError("Please attach requirements JSON"); return; }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("requirements", requirements);
      form.append("variables", variables);

      const res = await fetch("/api/generate", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRunId(data.runId);
      setTree(data.tree);
    } catch (e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function renderTree(node: TreeNode) {
    if (!node) return null;
    return (
      <div className="ml-4">
        <div className="flex items-center gap-2">
          <span>{node.type === "dir" ? "📁" : "📄"} {node.name}</span>
          {runId && node.type === "file" && (
            <a className="underline text-emerald-400"
               href={`/api/runs/${runId}/file?path=${encodeURIComponent(node.path)}`}
               target="_blank" rel="noreferrer">
              download
            </a>
          )}
        </div>
        {node.children?.map((c) => <div key={c.path}>{renderTree(c)}</div>)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Meta-Template Builder</h1>
      <p className="text-zinc-300">Upload requirements, set variables, generate agent templates.</p>

      <div className="space-y-3">
        <label className="block font-semibold">Requirements JSON</label>
        <input type="file" accept="application/json"
          onChange={(e) => setRequirements(e.target.files?.[0] ?? null)} />
      </div>

      <div className="space-y-3">
        <label className="block font-semibold">Variables (JSON)</label>
        <textarea className="w-full h-48 p-3 bg-zinc-900 rounded"
                  value={variables} onChange={(e) => setVariables(e.target.value)} />
      </div>

      <button disabled={loading} onClick={onGenerate}
              className="px-4 py-2 bg-emerald-500 rounded text-black font-semibold">
        {loading ? "Generating…" : "Generate Templates"}
      </button>

      {error && <div className="text-red-400">{error}</div>}

      {runId && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Output</h2>
            <a className="underline text-emerald-400" href={`/api/runs/${runId}/zip`} target="_blank" rel="noreferrer">
              Download ZIP
            </a>
          </div>
          {tree ? renderTree(tree) : <div className="text-zinc-400">No files</div>}
        </div>
      )}
    </div>
  );
}