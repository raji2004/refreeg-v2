/**
 * Lightweight Short-TTL Cache + Singleflight Request Coalescing for Mobile Feeds.
 * Prevents 1,000-user pull-to-refresh stampedes from overwhelming PostgreSQL
 * with duplicate concurrent read queries while keeping feed data fresh.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const MAX_CACHE_ENTRIES = 500;
const cacheStore = new Map<string, CacheEntry<unknown>>();
const inflightStore = new Map<string, Promise<unknown>>();

export async function withMobileCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const cached = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (cached && now < cached.expiresAt) {
    return cached.value;
  }

  const existingInflight = inflightStore.get(key) as Promise<T> | undefined;
  if (existingInflight) {
    return existingInflight;
  }

  const promise = (async () => {
    try {
      const result = await fetcher();
      if (cacheStore.size >= MAX_CACHE_ENTRIES) {
        // Evict oldest / expired entries to prevent unbounded growth during soak tests
        for (const [k, v] of cacheStore.entries()) {
          if (Date.now() >= v.expiresAt || cacheStore.size >= MAX_CACHE_ENTRIES) {
            cacheStore.delete(k);
          }
          if (cacheStore.size < MAX_CACHE_ENTRIES * 0.8) break;
        }
      }
      cacheStore.set(key, {
        value: result,
        expiresAt: Date.now() + ttlMs,
      });
      return result;
    } finally {
      inflightStore.delete(key);
    }
  })();

  inflightStore.set(key, promise);
  return promise;
}

export function invalidateMobileCachePrefix(prefix: string): void {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}
