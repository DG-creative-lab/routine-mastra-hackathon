import { ToolCatalogItem, AgentSpecFile, FsNode, EnvInfo } from "./types";

export async function getEnv(): Promise<EnvInfo> {
  const r = await fetch("/api/env", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load env");
  return r.json();
}

export async function fetchTools(q?: string, channel?: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (channel) params.set("channel", channel);
  const r = await fetch(`/api/tools?${params.toString()}`, { method: "GET" });
  if (!r.ok) throw new Error("Failed to load tools");
  const data: { tools: ToolCatalogItem[] } = await r.json();
  return data.tools;
}

export async function postSpecify(input: { text: string; channels?: string[] }) {
  const r = await fetch("/api/specify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (r.status === 429) {
    const j = await r.json().catch(() => ({}));
    const err = new Error("RATE_LIMIT");
    // @ts-expect-error attach extra
    err.remaining = j.remaining;
    // @ts-expect-error attach extra
    err.reset = j.reset;
    throw err;
  }

  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Specify failed (${r.status})`);
  }

  return r.json() as Promise<{ runId: string; spec: AgentSpecFile }>;
}

export async function postGenerateReuse(input: { runId: string; title?: string }) {
  const r = await fetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Generate failed (${r.status})`);
  }
  return r.json() as Promise<{ runId: string; tree: FsNode }>;
}

export async function postGenerateUpload(form: FormData) {
  const r = await fetch("/api/generate", { method: "POST", body: form });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Generate failed (${r.status})`);
  }
  return r.json() as Promise<{ runId: string; tree: FsNode }>;
}

export async function validateSpec(body: { json?: string; object?: unknown }) {
  const r = await fetch("/api/validate-spec", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Validate failed (${r.status})`);
  }
  return r.json() as Promise<{ ok: true; spec: AgentSpecFile } | { ok: false; error: string }>;
}

export async function fetchRunTree(runId: string) {
  const r = await fetch(`/api/runs/${encodeURIComponent(runId)}/tree`, { cache: "no-store" });
  if (!r.ok) throw new Error(`Failed to load tree (${r.status})`);
  return r.json() as Promise<FsNode>;
}

export async function fetchFile(runId: string, path: string) {
  const r = await fetch(`/api/runs/${encodeURIComponent(runId)}/file?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error(`Failed to load file (${r.status})`);
  // Try text first, fallback to blob
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("text/") || ct.includes("json") || ct.includes("javascript") || ct.includes("typescript")) {
    return { type: "text" as const, content: await r.text(), contentType: ct };
  }
  return { type: "blob" as const, content: await r.blob(), contentType: ct };
}
