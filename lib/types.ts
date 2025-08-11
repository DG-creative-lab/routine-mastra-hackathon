export type Channel = "Search" | "DV360" | "Meta" | "AMC" | "Generic";

export type ToolCatalogItem = {
  id: string;
  title: string;
  channel: Channel;
  description: string;
  examples?: string[];
  inputs_hint?: Record<string, string> | string;
  outputs_hint?: Record<string, string> | string;
};

export type AgentSpecFile = unknown; // normalized spec from /api/specify or /api/validate-spec

export type FsNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FsNode[];
};

export type EnvInfo = {
  DEMO_MODE: boolean;
  LLM_MODEL: string;
};
