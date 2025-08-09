import { useState, useEffect } from "react";
import { Upload, FileText, Zap, CheckCircle, Download } from "lucide-react";

type TreeNode = { 
  name: string; 
  path: string; 
  type: "file" | "dir"; 
  children?: TreeNode[] 
};

// Robot Component with integrated form
function Robot({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      {/* Robot Body */}
      <div className="relative w-full h-full">
        {/* Head */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-20 bg-gradient-to-b from-slate-200 to-slate-300 rounded-t-3xl border-2 border-slate-400">
          {/* Antenna */}
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-slate-400">
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
          </div>
          {/* Eyes */}
          <div className="absolute top-6 left-4 w-4 h-4 bg-slate-800 rounded-full"></div>
          <div className="absolute top-6 right-4 w-4 h-4 bg-slate-800 rounded-full"></div>
          {/* Smile */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-8 h-4">
            <div className="w-full h-1 bg-sky-500 rounded-full"></div>
          </div>
        </div>
        
        {/* Body */}
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-32 h-40 bg-gradient-to-b from-slate-300 to-slate-400 rounded-2xl border-2 border-slate-400">
          {/* Chest Panel - This is where the form will be integrated */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-24 h-32 bg-sky-100 rounded-xl border border-sky-300 p-2">
            {children}
          </div>
        </div>
        
        {/* Arms */}
        <div className="absolute top-20 left-2 w-6 h-20 bg-slate-400 rounded-full border border-slate-500 transform -rotate-12"></div>
        <div className="absolute top-20 right-2 w-6 h-20 bg-slate-400 rounded-full border border-slate-500 transform rotate-12"></div>
        
        {/* Legs */}
        <div className="absolute bottom-0 left-8 w-6 h-16 bg-slate-400 rounded-full border border-slate-500"></div>
        <div className="absolute bottom-0 right-8 w-6 h-16 bg-slate-400 rounded-full border border-slate-500"></div>
      </div>
    </div>
  );
}

// Thought bubble component
function ThoughtBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Main bubble */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 max-w-sm relative">
        {children}
        
        {/* Bubble tail - multiple small circles leading to robot */}
        <div className="absolute -bottom-4 left-8">
          <div className="w-4 h-4 bg-white border border-slate-200 rounded-full"></div>
        </div>
        <div className="absolute -bottom-8 left-12">
          <div className="w-3 h-3 bg-white border border-slate-200 rounded-full"></div>
        </div>
        <div className="absolute -bottom-10 left-16">
          <div className="w-2 h-2 bg-white border border-slate-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

export default function HelloPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [variables, setVariables] = useState<string>("{}");
  const [runId, setRunId] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseApi = "/api/runs";

  // Poll for tree
  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${baseApi}/${runId}/tree`);
        if (res.ok) {
          const { tree: data } = await res.json();
          if (data) {
            setTree([data]);
            setLoading(false);
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error("Error fetching tree:", e);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [runId]);

  // Generate handler
  const handleGenerate = async () => {
    if (!file) {
      setError("Please select a requirements JSON file.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setTree(null);
    setRunId(null);

    const form = new FormData();
    form.append("requirements", file);
    form.append("variables", variables);

    try {
      const res = await fetch("/api/generate", { method: "POST", body: form });
      const json = await res.json();
      if (res.ok) {
        setRunId(json.runId);
      } else {
        setError(json.error || "Generation failed");
        setLoading(false);
      }
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-sky-50 to-emerald-50 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-10 right-10 w-32 h-32 bg-sky-100 rounded-full opacity-50 animate-pulse"></div>
      <div className="absolute bottom-20 left-10 w-24 h-24 bg-emerald-100 rounded-full opacity-50 animate-bounce"></div>
      <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-purple-100 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-1/3 right-1/4 w-28 h-28 bg-pink-100 rounded-full opacity-30 animate-bounce" style={{ animationDelay: '2s' }}></div>
      
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        {/* Thought Bubble above robot */}
        <div className="mb-8 animate-float">
          <ThoughtBubble>
            <div className="text-center">
              <h3 className="font-bold text-slate-800 text-lg mb-3">How I Work</h3>
              <div className="text-sm text-slate-600 space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Validates specs with Zod</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>Plans with Routine-style steps</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span>Scaffolds nodes, workflow & docs</span>
                </div>
              </div>
            </div>
          </ThoughtBubble>
        </div>

        {/* Robot with integrated form */}
        <div className="relative">
          <Robot className="w-48 h-48 animate-float">
            {/* Integrated form inside robot's chest */}
            <div className="w-full h-full flex flex-col items-center justify-center p-1">
              <div className="space-y-2 w-full">
                {/* File upload (tiny) */}
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload" 
                    className="flex items-center justify-center w-full h-8 bg-white rounded border border-sky-300 cursor-pointer hover:bg-sky-50 transition-colors"
                  >
                    <Upload className="w-3 h-3 text-sky-600" />
                  </label>
                </div>

                {/* Variables input (tiny) */}
                <textarea
                  rows={2}
                  value={variables}
                  onChange={(e) => setVariables(e.target.value)}
                  className="w-full h-12 text-xs p-1 border border-sky-300 rounded resize-none"
                  placeholder='{"key":"val"}'
                />

                {/* Generate button (tiny) */}
                <button 
                  onClick={handleGenerate} 
                  disabled={loading}
                  className="w-full h-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-medium rounded transition-colors flex items-center justify-center gap-1"
                >
                  {loading ? (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  ) : (
                    <>
                      <Zap className="w-2 h-2" />
                      <span>GO</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </Robot>

          {/* Generated files floating around robot */}
          {tree && runId && (
            <div className="absolute -top-4 -right-8 space-y-2 animate-fade-in">
              {tree[0].children?.slice(0, 3).map((node, index) =>
                node.type === "file" ? (
                  <a
                    key={node.path}
                    href={`${baseApi}/${runId}/file?path=${encodeURIComponent(node.path)}`}
                    className="flex items-center gap-2 bg-white/90 backdrop-blur-sm text-slate-700 px-3 py-2 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 animate-bounce-in"
                    style={{ animationDelay: `${index * 200}ms` }}
                    target="_blank"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-medium">{node.name}</span>
                  </a>
                ) : null
              )}
              
              {/* Download all button */}
              <a
                href={`${baseApi}/${runId}/zip`}
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 animate-bounce-in"
                style={{ animationDelay: "600ms" }}
                target="_blank"
              >
                <Download className="w-4 h-4" />
                <span className="text-xs font-bold">Download All</span>
              </a>
            </div>
          )}
        </div>

        {/* Error message below robot */}
        {error && (
          <div className="mt-4 text-red-600 text-sm bg-red-50 px-4 py-2 rounded-full border border-red-200 animate-shake">
            {error}
          </div>
        )}

        {/* File name indicator */}
        {file && (
          <div className="mt-2 text-xs text-slate-600 bg-white/80 px-3 py-1 rounded-full">
            📁 {file.name}
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-bounce-in {
          animation: bounceIn 0.6s ease-out forwards;
          opacity: 0;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes bounceIn {
          0% { 
            opacity: 0;
            transform: scale(0.3) translateY(20px);
          }
          50% { 
            opacity: 1;
            transform: scale(1.05) translateY(-5px);
          }
          100% { 
            opacity: 1;
            transform: scale(1) translateY(0px);
          }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}