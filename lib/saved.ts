import type { Prisma } from "@prisma/client";

export type SavedKind = "cause" | "petition";
export type SavedStatus = "open" | "closed" | "paused" | "petition";

/** One card on the saved page. `id` is the bookmark id, not the campaign id. */
export interface SavedItem {
  id: string;
  targetId: string;
  kind: SavedKind;
  listId: string | null;
  title: string;
  image: string | null;
  href: string;
  status: SavedStatus;
  /** Naira for causes, signatures for petitions. */
  raised: number;
  goal: number;
  /** Naira still needed. Always 0 for petitions and closed campaigns. */
  short: number;
  percent: number;
  /** Whole days left, never negative. null when there is no end date. */
  daysLeft: number | null;
}

export interface SavedListSummary {
  id: string;
  name: string;
  color: string;
  count: number;
}

type BookmarkRow = {
  id: string;
  target_id: string;
  target_type: string;
  list_id: string | null;
};

type CauseRow = {
  id: string;
  title: string;
  image: string | null;
  goal: Prisma.Decimal;
  raised: Prisma.Decimal | null;
  status: string | null;
  end_date: Date | null;
  paused: boolean;
  compliance_paused: boolean;
};

type PetitionRow = {
  id: string;
  title: string;
  image: string | null;
  goal: number;
  raised: number;
};

const DAY_MS = 86_400_000;

const pct = (raised: number, goal: number) =>
  goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;

/**
 * Joins bookmarks to their campaigns. Bookmarks whose target no longer
 * exists are dropped, since the table has no FK to causes or petitions.
 */
export function toSavedItems(
  bookmarks: BookmarkRow[],
  causes: CauseRow[],
  petitions: PetitionRow[],
  now = Date.now(),
): SavedItem[] {
  const causeById = new Map(causes.map((c) => [c.id, c]));
  const petitionById = new Map(petitions.map((p) => [p.id, p]));
  const items: SavedItem[] = [];

  for (const b of bookmarks) {
    if (b.target_type === "cause") {
      const c = causeById.get(b.target_id);
      if (!c) continue;

      const goal = Number(c.goal);
      const raised = Number(c.raised ?? 0);
      const rawDays = c.end_date
        ? Math.ceil((c.end_date.getTime() - now) / DAY_MS)
        : null;
      const ended = rawDays !== null && rawDays <= 0;
      const status: SavedStatus =
        c.status === "closed" || ended
          ? "closed"
          : c.paused || c.compliance_paused
            ? "paused"
            : "open";

      items.push({
        id: b.id,
        targetId: c.id,
        kind: "cause",
        listId: b.list_id,
        title: c.title,
        image: c.image,
        href: `/causes/${c.id}`,
        status,
        raised,
        goal,
        short: status === "closed" ? 0 : Math.max(goal - raised, 0),
        percent: pct(raised, goal),
        daysLeft: rawDays === null ? null : Math.max(0, rawDays),
      });
    } else if (b.target_type === "petition") {
      const p = petitionById.get(b.target_id);
      if (!p) continue;

      items.push({
        id: b.id,
        targetId: p.id,
        kind: "petition",
        listId: b.list_id,
        title: p.title,
        image: p.image,
        href: `/petitions/${p.id}`,
        status: "petition",
        raised: p.raised,
        goal: p.goal,
        short: 0,
        percent: pct(p.raised, p.goal),
        daysLeft: null,
      });
    }
  }

  return items;
}

/** Only open campaigns can take money, so only they can be selected. */
export const isEligible = (item: SavedItem) => item.status === "open";

export const isClosingSoon = (item: SavedItem) =>
  item.status === "open" && item.daysLeft !== null && item.daysLeft <= 7;

/** The one-line reason shown on a card that select mode excludes. */
export function exclusionReason(item: SavedItem): string | null {
  switch (item.status) {
    case "closed":
      return "Closed, so it can't take a gift";
    case "paused":
      return "Paused, so it isn't taking gifts";
    case "petition":
      return "A petition, so it takes signatures";
    default:
      return null;
  }
}

export const daysLabel = (n: number) => `${n} ${n === 1 ? "day" : "days"} left`;
