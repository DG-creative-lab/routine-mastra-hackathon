import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Result = {
  pass: boolean;
  remaining: number;
  resetMs: number;
  limit: number;
};

const IS_DEV = process.env.NODE_ENV !== "production";

const ALLOWLIST = (process.env.RL_ALLOWLIST ?? "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const PER_MIN  = Number(process.env.RL_SPECIFY_PER_MIN  ?? 5);
const PER_HOUR = Number(process.env.RL_SPECIFY_PER_HOUR ?? 60);

// Create Edge-compatible clients if configured
const redis =
  URL && TOKEN ? new Redis({ url: URL, token: TOKEN }) : undefined;

// Warn once in prod if missing
let warnedNoRedis = false;
if (!IS_DEV && !redis && !warnedNoRedis) {
  warnedNoRedis = true;
  console.warn("[rateLimit] Redis not configured; /api/specify is NOT rate-limited.");
}

const perMin = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(PER_MIN, "1 m"),
      analytics: true,
      prefix: "rl:specify:1m",
    })
  : undefined;

const perHour = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(PER_HOUR, "1 h"),
      analytics: true,
      prefix: "rl:specify:1h",
    })
  : undefined;

/** Rate-limit /api/specify by IP with minute + hour buckets. */
export async function limitSpecify(ip: string): Promise<Result> {
  // dev: no limit; allowlisted IPs: no limit
  if (IS_DEV || ALLOWLIST.includes(ip)) {
    return { pass: true, remaining: 9999, resetMs: Date.now(), limit: 9999 };
  }
  // If Redis not configured, pass (don’t brick the app)
  if (!perMin || !perHour) {
    return { pass: true, remaining: 9999, resetMs: Date.now(), limit: 9999 };
  }

  const [m, h] = await Promise.all([perMin.limit(ip), perHour.limit(ip)]);
  const pass = m.success && h.success;

  const remaining = Math.min(m.remaining, h.remaining);
  const resetMs   = Math.max(m.reset, h.reset);
  const limit     = Math.min(m.limit, h.limit);

  return { pass, remaining, resetMs, limit };
}