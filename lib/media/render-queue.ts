/**
 * Runs at most `limit` jobs at once and shares one job between callers that
 * ask for the same key while it is still running.
 */
export function createRenderQueue(limit: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  const inFlight = new Map<string, Promise<unknown>>();

  async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
    if (active < limit) active++;
    else await new Promise<void>((resolve) => waiting.push(resolve));
    try {
      return await fn();
    } finally {
      // Hand the slot straight to the next waiter so a new arrival can't jump it.
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  }

  return {
    run<T>(key: string, fn: () => Promise<T>): Promise<T> {
      const existing = inFlight.get(key) as Promise<T> | undefined;
      if (existing) return existing;

      const job = withSlot(fn).finally(() => inFlight.delete(key));
      inFlight.set(key, job);
      return job;
    },
  };
}
