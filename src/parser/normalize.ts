import { AgentSpec } from "./schema";

/** Helpers -------------------------------------------------------- */

/** Convert strings like "↓ 50 % manual monitoring time" ⇒ { value: 50, direction: "down", unit: "%" } */
const parseDeltaString = (raw: string) => {
  const dir  = raw.includes("↓") ? "down" : raw.includes("↑") ? "up" : "neutral";
  const num  = Number((raw.match(/[\d.]+/) || [0])[0]);
  const unit = raw.includes("%") ? "%" : raw.includes("$") ? "$" : undefined;
  return { value: num, direction: dir, unit };
};

/** Canonicalise keys: spaces→_, lowerCase */
const canonKey = (k: string) => k.trim().toLowerCase().replace(/\s+/g, "_");

/** Normalise one AgentSpec --------------------------------------- */
export const normaliseAgentSpec = (raw: AgentSpec): AgentSpec => {
  // deep-clone to avoid side-effects
  const spec: AgentSpec = JSON.parse(JSON.stringify(raw));

  /* 1. Canonicalise required_features keys */
  const newRF: Record<string, any> = {};
  Object.entries(spec.required_features).forEach(([k, v]) => {
    newRF[canonKey(k)] = v;
  });
  spec.required_features = newRF;

  /* 2. Parse ⚡ numbers inside success_metrics */
  const sm = spec.success_metrics;
  Object.entries(sm).forEach(([k, v]) => {
    if (typeof v === "string" && v.match(/[%$]/)) {
      // @ts-ignore
      sm[k] = parseDeltaString(v);
    }
  });
  if (sm.feature_quality) {
    Object.entries(sm.feature_quality).forEach(([k, v]) => {
      if (typeof v === "string" && v.match(/[%$]/)) {
        // @ts-ignore
        sm.feature_quality[k] = parseDeltaString(v);
      }
    });
  }

  /* 3. Ensure all timeline keys are arrays */
  const t = spec.timeline;
  Object.keys(t).forEach((k) => {
    // @ts-ignore
    if (!Array.isArray(t[k])) t[k] = [t[k]];
  });

  return spec;
};