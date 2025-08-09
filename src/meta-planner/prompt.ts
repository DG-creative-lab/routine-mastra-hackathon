// src/meta-planner/prompt.ts
import { CanonicalSpec } from "../types/cannonical";

export const SYSTEM_PROMPT = `
You are *ArchitectGPT* — design Routine-style multi-agent systems for marketing,
and emit a machine-consumable JSON spec for each channel.

Return **JSON ONLY** with this shape:

{
  "agent_specs": [
    {
      "channel_id": "slug_like_this",
      "agents": [
        {
          "role": "planner",
          "name": "Planner",
          "instructions": "short sentence about planning policy",
          "routine_steps": [
            { "tool": "tool.id", "inputs": { "...": "..." }, "outputs": ["name"], "condition": "optional string" }
          ]
        },
        {
          "role": "executor",
          "name": "Executor",
          "instructions": "how to run tools safely",
          "tools_allowed": ["tool.id", "..."],
          "kpis": ["optional_kpi_names"]
        },
        {
          "role": "critic",
          "name": "Critic",
          "guardrails": [
            { "type": "bound_change_pct", "tool": "gAds.updateBid", "maxAbsPct": 25 },
            { "type": "gate_on_flag", "flagFrom": "compute.check.flag", "equals": "low" },
            { "type": "require_inputs", "tool": "gAds.updateBid", "keys": ["campaignId","percent"] }
          ],
          "kpis": ["roas","bid_delta_pct"]
        },
        {
          "role": "observer",
          "name": "Observer",
          "observer": {
            "sinks": [ { "type": "console" }, { "type": "jsonl", "path": ".runs/observer-events.jsonl" } ],
            "events": ["plan_started","plan_finished","step_started","step_finished","tool_called","tool_result","critic_failure","reward"],
            "kpis": ["roas","bid_delta_pct"]
          }
        }
      ]
    }
  ]
}

**Rules**
- Use ONLY tools listed in the input spec per channel.
- Keep routine_steps short (≤7) and reflect workflow_brief.
- Use the spec's critic_hints / observer_hints / kpis when present.
- No prose. If unsure about sinks, choose [console, jsonl].
`.trim();

export function buildUserPrompt(specs: CanonicalSpec[]): string {
  const pretty = JSON.stringify(specs, null, 2);
  // minimal few-shot inline (search guardian)
  const fewshot = `
### Example
Input (1 channel, abbreviated):
[
  {
    "id": "search_bid_guardian",
    "workflow_brief": ["ga4.pull → compute.check → gAds.updateBid(-20%)"],
    "tools": {
      "ga4.pull": {}, "compute.check": {}, "gAds.updateBid": {}
    },
    "critic_hints": { "max_bid_change_pct": 25, "only_when_flag": "low" },
    "observer_hints": { "sinks": [{"type":"console"}] },
    "kpis": ["roas","bid_delta_pct"]
  }
]

Output:
{
  "agent_specs": [
    {
      "channel_id": "search_bid_guardian",
      "agents": [
        {
          "role": "planner",
          "name": "Planner",
          "routine_steps": [
            { "tool": "ga4.pull",       "inputs": {"lookbackDays": 1}, "outputs": ["rows"] },
            { "tool": "compute.check",  "inputs": {"roas":  "$1.rows[0].roas", "threshold": 3}, "outputs": ["flag"] },
            { "tool": "gAds.updateBid", "inputs": {"campaignId": 123, "percent": -20}, "outputs": ["oldMicros","newMicros"], "condition": "$2.flag == 'low'" }
          ]
        },
        {
          "role": "executor",
          "name": "Executor",
          "tools_allowed": ["ga4.pull","compute.check","gAds.updateBid"],
          "kpis": ["roas","bid_delta_pct"]
        },
        {
          "role": "critic",
          "name": "Critic",
          "guardrails": [
            { "type": "bound_change_pct", "tool": "gAds.updateBid", "maxAbsPct": 25 },
            { "type": "gate_on_flag", "flagFrom": "compute.check.flag", "equals": "low" },
            { "type": "require_inputs", "tool": "gAds.updateBid", "keys": ["campaignId","percent"] }
          ]
        },
        {
          "role": "observer",
          "name": "Observer",
          "observer": { "sinks": [{"type":"console"},{"type":"jsonl"}], "events": ["step_started","step_finished"], "kpis": ["roas","bid_delta_pct"] }
        }
      ]
    }
  ]
}
`.trim();

  return `
You will receive an array of CanonicalSpec objects describing channels and their tools.

Return the **agent_specs** JSON as per the schema above.

INPUT_SPEC:
\`\`\`json
${pretty}
\`\`\`

${fewshot}
`.trim();
}