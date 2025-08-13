import type { CriticRule } from "../types/agents";
import type { ToolBinding } from "./types";
import type { RoutinePlan } from "@/types/canonical";
import type { ObserverSpec } from "@/types/agents";

export function file_planJson(planRaw: string) {
  return planRaw;
}

export function file_nodesTs(plan: RoutinePlan) {
  return `// AUTO-GENERATED — nodes.ts
export type Node = {
  id: string;
  tool: string;
  inputs: Record<string, any>;
  condition?: string;
  outputs?: string[];
};

export const nodes: Node[] = ${JSON.stringify(
    plan.map(s => ({
      id: `step-${s.id}`,
      tool: s.tool,
      inputs: s.inputs ?? {},
      condition: s.condition ?? "",
      outputs: s.outputs ?? [],
    })),
    null,
    2
  )};
`;
}

export function file_workflowTs(plan: RoutinePlan, toolBindings: ToolBinding[]) {
  const uniqueImports = Array.from(new Map(toolBindings.map(b => [b.importName, b])).values());

  const stepCalls = plan.map((s) => {
    const binding = toolBindings.find(b => b.id === s.tool);
    const inputsExpr = JSON.stringify(s.inputs ?? {}, null, 0);
    const call = binding
      ? binding.invoke(`resolveInputs(${inputsExpr}, ctx)`)
      : `/* TODO: implement tool '${s.tool}' */ null`;

    const cond = s.condition
      ? `if (evaluateCondition(${JSON.stringify(s.condition)}, ctx)) { result = ${call}; } else { result = null; }`
      : `result = ${call};`;

    const saveOutputs = (s.outputs?.length ?? 0) > 0
      ? s.outputs!.map((name, idx) =>
          `ctx["$${s.id}.${name}"] = (result && result.${name} !== undefined) ? result.${name} : (Array.isArray(result) ? result[${idx}] : result);`
        ).join("\n    ")
      : `ctx["$${s.id}.result"] = result;`;

    return `
  // Step ${s.id} — ${s.tool}${s.description ? ` — ${s.description}` : ""}
  {
    let result: any = null;
    await observer.stepStart(${s.id}, "${s.tool}", ctx);
    ${cond}
    ${saveOutputs}
    await critics.runAll?.({ step: ${s.id}, tool: "${s.tool}", ctx, result });
    await observer.stepEnd(${s.id}, "${s.tool}", result, ctx);
  }`.trim();
  }).join("\n");

  return `// AUTO-GENERATED — workflow.ts
// Minimal runtime that executes the Routine plan by calling bound tools.

import observers from "./observer";
import critics from "./critics";
const observer = observers; // alias

import {
${uniqueImports.map(b => `  ${b.importName},`).join("\n")}
} from "${uniqueImports[0]?.importPath ?? "../../src/tools"}";

type Ctx = Record<string, any>;

function get(ctx: Ctx, ref: string) {
  return ctx[ref];
}
function resolveInputs(obj: any, ctx: Ctx): any {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(v => resolveInputs(v, ctx));
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = (typeof v === "string" && v.startsWith("$")) ? get(ctx, v) : resolveInputs(v, ctx);
  }
  return out;
}
// toy evaluator – replace with a safe expr lib if needed
function evaluateCondition(expr: string, ctx: Ctx): boolean {
  try {
    const safe = expr.replace(/\\$\\d+\\.[A-Za-z0-9_]+/g, (m) => JSON.stringify(get(ctx, m)));
    // eslint-disable-next-line no-new-func
    return Boolean(Function(\`return (\${safe});\`)());
  } catch { return false; }
}

export async function run(initial: Record<string, any> = {}) {
  const ctx: Ctx = { ...initial };

${stepCalls}

  await observer.runEnd?.(ctx);
  return ctx;
}
export default { run };
`;
}

export function file_criticsTs(rules: CriticRule[] = []) {
  return `// AUTO-GENERATED — critics.ts
// Lightweight critic runner. 'when' is a boolean expression over 'ctx' & 'result'.
// Severity 'error' throws; 'warn' logs.

type Ctx = Record<string, any>;
type Rule = {
  id: string;
  name: string;
  when?: string;
  severity?: "error" | "warn";
  action?: string;
  description?: string;
};

const rules: Rule[] = ${JSON.stringify(rules, null, 2)};

function evaluate(expr: string, ctx: Ctx, result: any): boolean {
  try {
    const safe = expr
      .replace(/\\bresult\\b/g, JSON.stringify(result))
      .replace(/\\$\\d+\\.[A-Za-z0-9_]+/g, (m) => JSON.stringify(ctx[m]));
    // eslint-disable-next-line no-new-func
    return Boolean(Function(\`return (\${safe});\`)());
  } catch { return false; }
}

async function runAll({ step, tool, ctx, result }:{ step:number; tool:string; ctx: Ctx; result:any }) {
  for (const r of rules) {
    if (!r.when) continue;
    const hit = evaluate(r.when, ctx, result);
    if (!hit) continue;
    const msg = \`[CRITIC:\${r.severity ?? "warn"}] \${r.name} (rule=\${r.id}) on step \${step} \${tool} :: \${r.action ?? ""}\`;
    if ((r.severity ?? "warn") === "error") throw new Error(msg);
    console.warn(msg);
  }
}

export default { runAll, rules };
`;
}

export function file_observerTs(spec?: ObserverSpec) {
  const { counters = [], gauges = [], events = [], notes = "" } = spec ?? {};
  return `// AUTO-GENERATED — observer.ts
// Minimal observable stub. Replace with OpenTelemetry/Langfuse/etc.

type Ctx = Record<string, any>;
const counters = new Map<string, number>();
const gauges   = new Map<string, number>();

${counters.map(k => `counters.set("${k}", 0);`).join("\n")}
${gauges.map(k => `gauges.set("${k}", 0);`).join("\n")}

async function stepStart(step:number, tool:string, ctx: Ctx) {
  ${counters.length ? `counters.set("${counters[0]}", (counters.get("${counters[0]}") ?? 0) + 1);` : ""}
}
async function stepEnd(step:number, tool:string, result:any, ctx: Ctx) {
  // place to record timing, token cost, success flags…
}
async function runEnd(ctx: Ctx) {
  // final flush
}

function emitEvent(name: string, payload?: any) {
  if (!${JSON.stringify(events)}.includes(name)) return;
  // no-op: wire to your analytics here
}

export default { stepStart, stepEnd, runEnd, emitEvent };

// Notes from planner:
// ${notes ? notes.replace(/\n/g, "\n// ") : "// (none)"}
`;
}

export function file_registerTs() {
  return `// AUTO-GENERATED — register.ts
export async function register() { return true; }
export default register;
`;
}

export function file_readmeMd(title = "Generated Template") {
  return `# ${title}

This template was generated by Meta-Template Builder from a Routine plan.

## Files
- \`plan.json\` — canonical plan
- \`nodes.ts\` — node descriptors
- \`workflow.ts\` — minimal runner (+ observers + critics)
- \`critics.ts\` — auto-listed rules from planner (edit as needed)
- \`observer.ts\` — stub (replace with OpenTelemetry/Langfuse)
- \`register.ts\` — deploy stub
`;
}