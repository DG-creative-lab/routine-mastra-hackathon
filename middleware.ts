import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/* --------------------- Rate limit setup --------------------- */

type Result = {
  pass: boolean;
  remaining: number;
  resetMs: number;
  limit: number;
};

const IS_DEV = process.env.NODE_ENV !== "production";

const ALLOWLIST = (process.env.RL_ALLOWLIST ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const PER_MIN = Number(process.env.RL_SPECIFY_PER_MIN ?? 5);
const PER_HOUR = Number(process.env.RL_SPECIFY_PER_HOUR ?? 60);

// Edge-compatible clients (only if configured)
const redis = URL && TOKEN ? new Redis({ url: URL, token: TOKEN }) : undefined;

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

/** Minute + hour buckets by IP; pass-through in dev or when Redis is missing. */
export async function limitSpecify(ip: string): Promise<Result> {
  if (IS_DEV || ALLOWLIST.includes(ip) || !perMin || !perHour) {
    return { pass: true, remaining: 9999, resetMs: Date.now(), limit: 9999 };
  }

  const [m, h] = await Promise.all([perMin.limit(ip), perHour.limit(ip)]);
  const pass = m.success && h.success;
  return {
    pass,
    remaining: Math.min(m.remaining, h.remaining),
    resetMs: Math.max(m.reset, h.reset),
    limit: Math.min(m.limit, h.limit),
  };
}

/* --------------------- Middleware entry --------------------- */

export async function middleware(req: NextRequest) {
  // Allow preflight through
  if (req.method === "OPTIONS") return NextResponse.next();

  const { pathname, searchParams } = req.nextUrl;

  // 1) Optional token gate for all API routes
  const required = process.env.ACCESS_TOKEN;
  if (required) {
    const auth = req.headers.get("authorization") || "";
    const bearer =
      auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
    const token =
      bearer ||
      req.headers.get("x-auth-token") ||
      searchParams.get("token");

    if (token !== required) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 2) Rate-limit only /api/specify
  if (pathname.startsWith("/api/specify")) {
    const ip =
      req.ip ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "0.0.0.0";

    const rl = await limitSpecify(ip);
    if (!rl.pass) {
      const headers = new Headers({
        "x-ratelimit-limit": String(rl.limit),
        "x-ratelimit-remaining": String(rl.remaining),
        "x-ratelimit-reset": String(rl.resetMs),
      });
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          remaining: rl.remaining,
          reset: rl.resetMs, // UI reads this to show reset time
        },
        { status: 429, headers }
      );
    }
  }

  return NextResponse.next();
}

/** Apply to all API routes; limiter triggers only for /api/specify. */
export const config = {
  matcher: ["/api/:path*"],
};
