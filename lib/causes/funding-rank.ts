/**
 * Funding-based ranking for causes.
 * Rule: the more naira raised, the earlier the cause is shown.
 *  1. Higher `raised` first
 *  2. Zero-raised causes always sink to the bottom
 *  3. Tie on raised → higher % of goal first (momentum)
 *  4. Still tied → newest first
 */

export interface FundableCause {
  raised: number | string | null | undefined;
  goal: number | string | null | undefined;
  created_at?: string | Date | null;
  createdAt?: string | Date | null;
}

const toNum = (v: number | string | null | undefined): number => Number(v) || 0;

const toTime = (c: FundableCause): number =>
  new Date(c.created_at ?? c.createdAt ?? 0).getTime() || 0;

/** 0..1 share of goal reached (safe when goal is 0). */
export function percentFunded(
  c: Pick<FundableCause, "raised" | "goal">,
): number {
  const goal = toNum(c.goal);
  return goal > 0 ? Math.min(toNum(c.raised) / goal, 1) : 0;
}

/** Returns a NEW array sorted most-funded-first. Never mutates the input. */
export function sortCausesByFunding<T extends FundableCause>(causes: T[]): T[] {
  return [...causes].sort((a, b) => {
    const raisedA = toNum(a.raised);
    const raisedB = toNum(b.raised);

    // Zero-raised causes always sink to the bottom
    if (raisedA === 0 && raisedB !== 0) return 1;
    if (raisedB === 0 && raisedA !== 0) return -1;

    // 1) More funding first
    if (raisedB !== raisedA) return raisedB - raisedA;

    // 2) Tie → higher % of goal first
    const pctA = percentFunded(a);
    const pctB = percentFunded(b);
    if (pctB !== pctA) return pctB - pctA;

    // 3) Still tied → newest first
    return toTime(b) - toTime(a);
  });
}
