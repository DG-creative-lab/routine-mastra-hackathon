// AUTO-GENERATED — critics.ts
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

const rules: Rule[] = [];

function evaluate(expr: string, ctx: Ctx, result: any): boolean {
  try {
    const safe = expr
      .replace(/\bresult\b/g, JSON.stringify(result))
      .replace(/\$\d+\.[A-Za-z0-9_]+/g, (m) => JSON.stringify(ctx[m]));
    // eslint-disable-next-line no-new-func
    return Boolean(Function(`return (${safe});`)());
  } catch { return false; }
}

async function runAll({ step, tool, ctx, result }:{ step:number; tool:string; ctx: Ctx; result:any }) {
  for (const r of rules) {
    if (!r.when) continue;
    const hit = evaluate(r.when, ctx, result);
    if (!hit) continue;
    const msg = `[CRITIC:${r.severity ?? "warn"}] ${r.name} (rule=${r.id}) on step ${step} ${tool} :: ${r.action ?? ""}`;
    if ((r.severity ?? "warn") === "error") throw new Error(msg);
    console.warn(msg);
  }
}

export default { runAll, rules };
