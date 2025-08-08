/*  ----------------------
    Centralised prompt builder used by `planner.ts` when we ask
    the LLM to sort each requirement into
    four Routine buckets: **planner · executor · critic · tools**.

    - Keeps the natural-language strings in one file  
    - Makes it easier to tweak few-shot examples without touching
      the orchestration code
*/

import { CanonicalSpec } from "../types/cannonical";


/*──────────────────────────────────────────────────────────────┐
  System prompt – never changes unless our taxonomy changes.
 └──────────────────────────────────────────────────────────────*/
export const SYSTEM_PROMPT = `
You are *ArchitectGPT* — an AI systems-designer that converts
marketing requirements into Routine-style agent blueprints and
Mastra workflow templates.

Routine (Yan et al., 2025) in one line:
  “Generate an explicit, step-by-step JSON plan, then execute it
  with typed parameter passing and optional critics.”

• Output *valid JSON only* – no prose, no markdown.  
• Top-level keys **must** be: "planner", "executor", "critic", "tools".  
• Each key holds an **array of requirement IDs** (strings).  
• A requirement ID may appear under multiple keys if needed.
`.trim();

/*──────────────────────────────────────────────────────────────┐
  Few-shot: 1️⃣ very small spec ➜ 1️⃣ expected bucket result.
 └──────────────────────────────────────────────────────────────*/
const FEW_SHOT_EXAMPLE = `
### Spec
[
  {
    "id": "search_monitoring_prediction",
    "tagline": "Proactive monitoring …",
    "required_features": { "core_capability": "KPI thresholds" },
    "success_metrics": {},
    "timeline": {}
  }
]

### ExpectedBuckets
{
  "planner":   ["search_monitoring_prediction"],
  "executor":  ["search_monitoring_prediction"],
  "critic":    ["search_monitoring_prediction"],
  "tools":     ["search_monitoring_prediction"]
}
`.trim();

/*──────────────────────────────────────────────────────────────┐
  Builds the *user* prompt for an arbitrary CanonicalSpec array.
 └──────────────────────────────────────────────────────────────*/
export function buildUserPrompt(spec: CanonicalSpec[]): string {
  const prettyJson = JSON.stringify(spec, null, 2);

  return `
You will receive **CanonicalSpec[]** JSON.

Your job:
  1. Inspect each "id".
  2. Decide which Routine bucket(s) the requirement belongs to.
  3. Produce *only JSON* (see ExpectedBuckets example).

\\\`\\\`\\\`json
${prettyJson}
\\\`\\\`\\\`

${FEW_SHOT_EXAMPLE}
`.trim();
}