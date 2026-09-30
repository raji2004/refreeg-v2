export interface FundableCause {
  raised: number | string | null | undefined;
  goal: number | string | null | undefined;
  created_at?: string | Date | null;
  createdAt?: string | Date | null;
}

const toNum = (v: number | string | null | undefined): number => Number(v) || 0;

const toTime = (c: FundableCause): number =>
  new Date(c.created_at ?? c.createdAt ?? 0).getTime() || 0;

export function percentFunded(
  c: Pick<FundableCause, "raised" | "goal">,
): number {
  const goal = toNum(c.goal);
  return goal > 0 ? Math.min(toNum(c.raised) / goal, 1) : 0;
}

export function sortCausesByFunding<T extends FundableCause>(causes: T[]): T[] {
  return [...causes].sort((a, b) => {
    const raisedA = toNum(a.raised);
    const raisedB = toNum(b.raised);

    if (raisedA === 0 && raisedB !== 0) return 1;
    if (raisedB === 0 && raisedA !== 0) return -1;

    if (raisedB !== raisedA) return raisedB - raisedA;

    const pctA = percentFunded(a);
    const pctB = percentFunded(b);
    if (pctB !== pctA) return pctB - pctA;

    return toTime(b) - toTime(a);
  });
}
