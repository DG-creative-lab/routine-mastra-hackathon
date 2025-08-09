// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Upload,
  FileText,
  Zap,
  CheckCircle,
  Download,
} from "lucide-react";
import RobotCard from "./components/RobotCard";

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
};

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [variables, setVariables] = useState("{}");
  const [runId, setRunId] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseApi = "/api/runs";

  // Poll for file tree
  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    const t = setInterval(async () => {
      const res = await fetch(`${baseApi}/${runId}/tree`);
      if (res.ok) {
        const { tree: data } = await res.json();
        if (data) {
          setTree([data]);
          setLoading(false);
          clearInterval(t);
        }
      }
    }, 1200);
    return () => clearInterval(t);
  }, [runId]);

  // Kick off generation
  const handleGenerate = async () => {
    if (!file) {
      setError("Please select a JSON requirements file.");
      return;
    }
    setLoading(true);
    setError(null);
    setTree(null);
    setRunId(null);

    const form = new FormData();
    form.append("requirements", file);
    form.append("variables", variables);

    const res = await fetch("/api/generate", {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (res.ok) {
      setRunId(json.runId);
    } else {
      setError(json.error || "Generation failed");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-sky-50 to-emerald-50 overflow-hidden p-8">
      {/* Thought bubble */}
      <div className="mb-8 animate-float">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 max-w-sm mx-auto relative">
          <h3 className="font-bold text-slate-800 text-lg mb-3">
            How I Work
          </h3>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Validates specs with Zod</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Plans Routine-style steps</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Scaffolds nodes, workflow & docs</span>
            </div>
          </div>
          {/* Bubble tail */}
          <div className="absolute -bottom-4 left-8">
            <div className="w-4 h-4 bg-white border border-slate-200 rounded-full" />
          </div>
          <div className="absolute -bottom-8 left-12">
            <div className="w-3 h-3 bg-white border border-slate-200 rounded-full" />
          </div>
          <div className="absolute -bottom-10 left-16">
            <div className="w-2 h-2 bg-white border border-slate-200 rounded-full" />
          </div>
        </div>
      </div>

      {/* Centered Robot + form */}
      <div className="flex justify-center">
        <RobotCard className="w-72 h-80 animate-float">
          <div className="space-y-2 w-full h-full flex flex-col items-center justify-center">
            {/* file picker */}
            <div className="relative w-full">
              <input
                type="file"
                accept=".json"
                onChange={(e) =>
                  setFile(e.target.files ? e.target.files[0] : null)
                }
                className="absolute inset-0 opacity-0 cursor-pointer"
                id="upload"
              />
              <label
                htmlFor="upload"
                className="flex items-center justify-center w-full h-10 bg-white rounded border border-sky-300 hover:bg-sky-50 transition"
              >
                <Upload className="w-4 h-4 text-sky-600" />
              </label>
            </div>
            {/* vars */}
            <textarea
              rows={3}
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              className="w-full h-16 text-sm p-2 border border-sky-300 rounded resize-none"
              placeholder='{"key":"val"}'
            />
            {/* GO */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full h-8 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm rounded transition flex items-center justify-center gap-1"
            >
              {loading ? (
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  <span>GO</span>
                </>
              )}
            </button>
            {error && (
              <div className="text-red-600 text-xs mt-1">{error}</div>
            )}
          </div>
        </RobotCard>
      </div>

      {/* floating output chips */}
      {tree && runId && (
        <div className="absolute top-1/3 right-4 space-y-2 animate-fade-in">
          {tree[0].children
            ?.filter((n) => n.type === "file")
            .slice(0, 3)
            .map((n, i) => (
              <a
                key={n.path}
                href={`${baseApi}/${runId}/file?path=${encodeURIComponent(
                  n.path
                )}`}
                className="flex items-center gap-2 bg-white/90 backdrop-blur-sm text-slate-700 px-3 py-2 rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105 animate-bounce-in"
                style={{ animationDelay: `${i * 200}ms` }}
                target="_blank"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium">{n.name}</span>
              </a>
            ))}
          <a
            href={`${baseApi}/${runId}/zip`}
            className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition transform hover:scale-105 animate-bounce-in"
            style={{ animationDelay: "600ms" }}
            target="_blank"
          >
            <Download className="w-4 h-4" />
            <span className="text-xs font-bold">Download All</span>
          </a>
        </div>
      )}
    </div>
  );
}