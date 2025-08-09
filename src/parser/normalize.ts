import { AgentSpec } from "./schema";

/** Helpers -------------------------------------------------------- */
const parseDeltaString = (raw: string) => {
  const dir  = raw.includes("↓") ? "down" : raw.includes("↑") ? "up" : "neutral";
  const num  = Number((raw.match(/[\d.]+/) || [0])[0]);
  const unit = raw.includes("%") ? "%" : raw.includes("$") ? "$" : undefined;
  return { value: num, direction: dir, unit };
};

/** Canonicalise keys: spaces→_, lowerCase */
const canonKey = (k: string) => k.trim().toLowerCase().replace(/\s+/g, "_");

/** Ensure array<string> (coerce single string to array) */
const toStringArray = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") return [v];
  return [];
};

/** Normalise one AgentSpec --------------------------------------- */
export const normaliseAgentSpec = (raw: AgentSpec): AgentSpec => {
  // deep clone
  const spec: AgentSpec = JSON.parse(JSON.stringify(raw));

  /* 1) Canonicalise required_features keys */
  if (spec.required_features && typeof spec.required_features === "object") {
    const newRF: Record<string, any> = {};
    Object.entries(spec.required_features).forEach(([k, v]) => {
      newRF[canonKey(k)] = v;
    });
    spec.required_features = newRF;
  }

  /* 2) Parse %/$ numbers inside success_metrics (keep passthrough keys intact) */
  const sm = spec.success_metrics ?? {};
  Object.entries(sm).forEach(([k, v]) => {
    if (typeof v === "string" && /[%$]/.test(v)) {
      // @ts-ignore – convert string to structured delta
      sm[k] = parseDeltaString(v);
    }
  });
  if (sm.feature_quality && typeof sm.feature_quality === "object") {
    Object.entries(sm.feature_quality).forEach(([k, v]) => {
      if (typeof v === "string" && /[%$]/.test(v)) {
        // @ts-ignore
        sm.feature_quality[k] = parseDeltaString(v);
      }
    });
  }
  spec.success_metrics = sm;

  /* 3) Ensure all timeline values are arrays */
  const t = spec.timeline ?? {};
  Object.keys(t).forEach((k) => {
    // @ts-ignore – convert single item to array
    if (!Array.isArray(t[k])) t[k] = [t[k]];
  });
  spec.timeline = t;

  /* 4) workflow_brief → always array<string> trimmed */
  if (spec.workflow_brief) {
    spec.workflow_brief = toStringArray(spec.workflow_brief).map((s) => s.trim());
  }

  /* 5) tools: canonicalize tool IDs to snake (no change to inner hints) */
  if (spec.tools && typeof spec.tools === "object") {
    const normalizedTools: Record<string, any> = {};
    Object.entries(spec.tools).forEach(([toolId, hint]) => {
      normalizedTools[canonKey(toolId)] = hint;
    });
    spec.tools = normalizedTools;
  }

  /* 6) kpis: trim */
  if (spec.kpis) {
    spec.kpis = toStringArray(spec.kpis).map((s) => s.trim());
  }

  /* 7) critic_hints / observer_hints: pass through (already validated by Zod) */

  return spec;
};