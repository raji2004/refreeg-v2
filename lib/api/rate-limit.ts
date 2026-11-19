// Small fixed-window in-memory limiter with a bounded key set. Per process:
// pair it with edge limits (CloudFront/WAF) for a real guarantee.
type Bucket = { count: number; resetAt: number };

export function createRateLimiter(opts: {
  max: number;
  windowMs: number;
  maxKeys?: number;
}) {
  const buckets = new Map<string, Bucket>();
  const maxKeys = opts.maxKeys ?? 10_000;

  return function isLimited(key: string, now = Date.now()): boolean {
    if (buckets.size >= maxKeys) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
      // Still full of live buckets: drop the oldest so memory stays bounded.
      while (buckets.size >= maxKeys) {
        const oldest = buckets.keys().next().value;
        if (oldest === undefined) break;
        buckets.delete(oldest);
      }
    }
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      return false;
    }
    bucket.count++;
    return bucket.count > opts.max;
  };
}
