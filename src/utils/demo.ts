export const DEMO = String(process.env.DEMO_MODE).toLowerCase() === "true";
export const DEMO_LATENCY = Number(process.env.DEMO_LATENCY_MS ?? 0);
const SEED = Number(process.env.DEMO_SEED ?? 1);

let seed = Number(process.env.DEMO_SEED ?? 42) | 0;
export function rand() {
  // xorshift32
  seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
  return ((seed >>> 0) % 1000) / 1000;
}
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
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