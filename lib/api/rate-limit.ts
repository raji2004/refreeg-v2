import { NextRequest } from "next/server";
import { apiError } from "@/lib/api/response";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 10000;
const buckets = new Map<string, RateLimitBucket>();

export function getClientIp(request: NextRequest): string {
  // Allow isolated load-test runner to simulate distinct mobile device IPs
  // when running in non-production or sandbox test mode.
  const isTestOrDev =
    process.env.NODE_ENV !== "production" ||
    process.env.STORE_REVIEW_DEMO_ENABLED === "true";
  if (isTestOrDev) {
    const simulatedIp = request.headers.get("x-simulated-client-ip");
    if (simulatedIp && simulatedIp.trim().length > 0) {
      return simulatedIp.trim();
    }
  }

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0]!.trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export interface RateLimitOptions {
  namespace: string;
  limit: number;
  windowMs: number;
  identifier?: string;
}

/**
 * Checks whether the request exceeds the configured sliding window rate limit.
 * Returns a NextResponse (429 Too Many Requests) if rate-limited, or null if allowed.
 */
export function enforceRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
) {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${options.namespace}:${ip}:${options.identifier || ""}`;

  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, v] of buckets.entries()) {
        if (now >= v.resetAt || buckets.size >= MAX_BUCKETS) {
          buckets.delete(k);
        }
        if (buckets.size < MAX_BUCKETS * 0.8) break;
      }
    }
    bucket = { count: 1, resetAt: now + options.windowMs };
    buckets.set(key, bucket);
    return null;
  }

  bucket.count += 1;
  if (bucket.count > options.limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000),
    );
    const res = apiError(
      `Too many requests. Please try again in ${retryAfterSec}s.`,
      429,
    );
    res.headers.set("Retry-After", String(retryAfterSec));
    return res;
  }

  return null;
}
