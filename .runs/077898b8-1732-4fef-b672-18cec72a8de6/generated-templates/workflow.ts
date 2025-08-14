// AUTO-GENERATED — workflow.ts
// Minimal runtime that executes the Routine plan by calling bound tools.

import observers from "./observer";
import critics from "./critics";
const observer = observers; // alias

import {

} from "../../src/tools";

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
    const safe = expr.replace(/\$\d+\.[A-Za-z0-9_]+/g, (m) => JSON.stringify(get(ctx, m)));
    // eslint-disable-next-line no-new-func
    return Boolean(Function(`return (${safe});`)());
  } catch { return false; }
}

export async function run(initial: Record<string, any> = {}) {
  const ctx: Ctx = { ...initial };

// Step 1 — amc.createlookalike
  {
    let result: any = null;
    await observer.stepStart(1, "amc.createlookalike", ctx);
    result = /* TODO: implement tool 'amc.createlookalike' */ null;
    ctx["$1.lookalike_audience_id"] = (result && result.lookalike_audience_id !== undefined) ? result.lookalike_audience_id : (Array.isArray(result) ? result[0] : result);
    await critics.runAll?.({ step: 1, tool: "amc.createlookalike", ctx, result });
    await observer.stepEnd(1, "amc.createlookalike", result, ctx);
  }

  await observer.runEnd?.(ctx);
  return ctx;
}
export default { run };
