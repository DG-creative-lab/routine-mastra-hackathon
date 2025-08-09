export const DEMO = String(process.env.DEMO_MODE).toLowerCase() === "true";
export const DEMO_LATENCY = Number(process.env.DEMO_LATENCY_MS ?? 0);
const SEED = Number(process.env.DEMO_SEED ?? 1);

let s = SEED || 1;
export function rand() {
  s = (s * 1664525 + 1013904223) % 4294967296;
  return s / 4294967296;
}
export async function sleep(ms: number) {
  if (ms > 0) await new Promise(res => setTimeout(res, ms));
}
export async function withDemo<T>(real: () => Promise<T>, fake: () => Promise<T>) {
  if (DEMO) {
    await sleep(DEMO_LATENCY);
    return fake();
  }
  return real();
}