// AUTO-GENERATED — observer.ts
// Minimal observable stub. Replace with OpenTelemetry/Langfuse/etc.

type Ctx = Record<string, any>;
const counters = new Map<string, number>();
const gauges   = new Map<string, number>();




async function stepStart(step:number, tool:string, ctx: Ctx) {
  
}
async function stepEnd(step:number, tool:string, result:any, ctx: Ctx) {
  // place to record timing, token cost, success flags…
}
async function runEnd(ctx: Ctx) {
  // final flush
}

function emitEvent(name: string, payload?: any) {
  if (![].includes(name)) return;
  // no-op: wire to your analytics here
}

export default { stepStart, stepEnd, runEnd, emitEvent };

// Notes from planner:
// // (none)
