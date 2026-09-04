"use server";

import { listCauses, countCauses } from "./cause-actions";
import { listPetitions, countPetitions } from "./petition-actions";
import { searchOrganizations } from "./organization-actions";
import type { Cause } from "@/types/cause-types";
import type { Petition } from "@/types/petition-types";
import { DISCOVER_RESULT_CAP } from "@/lib/discover-constants";

export type DiscoverSort =
  | "most-urgent"
  | "closest-to-goal"
  | "newest"
  | "most-given"
  | "closing-soonest";

export interface DiscoverFilters {
  category?: string;
  location?: string;
  urgentOnly?: boolean;
  verifiedOnly?: boolean;
  nearGoalOnly?: boolean;
  minAmountNeeded?: number;
  maxAmountNeeded?: number;
  includeType?: "all" | "campaigns" | "petitions";
  search?: string;
  sortBy?: DiscoverSort;
}

export interface DiscoverItem {
  type: "campaign" | "petition";
  id: string;
  title: string;
  image: string | null;
  orgName: string;
  verified: boolean;
  raised: number;
  goal: number;
  percent: number;
  daysLeft: number | null;
  urgent: boolean;
  location: string | null;
  /** Campaign detail page is locked while true; petitions are never paused. See prisma/schema/cause.prisma. */
  paused: boolean;
  createdAt: string;
}

/**
 * Orders a merged campaigns+petitions list. Needed because the two types
 * come from separate DB queries — a DB-level ORDER BY on each can't produce
 * one correctly-interleaved combined feed, so every sort is applied here
 * after merging.
 *
 * Paused campaigns (locked detail page, no real content yet) always sort
 * after everything else, regardless of the active sort — otherwise a batch
 * of just-reconstructed placeholders with a fresh `createdAt` can bury real
 * campaigns at the top of "Newest first".
 */
function compareItems(a: DiscoverItem, b: DiscoverItem, sortBy: DiscoverSort): number {
  if (a.paused !== b.paused) return a.paused ? 1 : -1;

  switch (sortBy) {
    case "closest-to-goal":
      return b.percent - a.percent;
    case "most-given":
      return b.raised - a.raised;
    case "most-urgent":
    case "closing-soonest":
      if (a.daysLeft == null && b.daysLeft == null) return 0;
      if (a.daysLeft == null) return 1;
      if (b.daysLeft == null) return -1;
      return a.daysLeft - b.daysLeft;
    case "newest":
    default:
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }
}

function daysLeftFromEndDate(endDate: string | null | undefined): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function causeToItem(cause: Cause): DiscoverItem {
  const daysLeft = daysLeftFromEndDate(cause.end_date);
  const goal = Number(cause.goal || 0);
  const raised = Number(cause.raised || 0);
  return {
    type: "campaign",
    id: cause.id,
    title: cause.title,
    image: cause.image || null,
    orgName: cause.profiles?.full_name || "Anonymous",
    verified: !!cause.profiles?.is_verified,
    raised,
    goal,
    percent: goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0,
    daysLeft,
    urgent: daysLeft != null && daysLeft <= 7,
    location: cause.location || null,
    paused: !!cause.paused,
    createdAt: cause.created_at,
  };
}

function petitionToItem(petition: Petition): DiscoverItem {
  const goal = Number(petition.goal || 0);
  const raised = Number(petition.raised || 0);
  return {
    type: "petition",
    id: petition.id,
    title: petition.title,
    image: petition.image || null,
    orgName: petition.profiles?.full_name || "Anonymous",
    verified: !!petition.profiles?.is_verified,
    raised,
    goal,
    percent: goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0,
    daysLeft: null,
    urgent: false,
    location: null,
    paused: false,
    createdAt: petition.created_at,
  };
}

export async function listDiscoverResults(
  filters: DiscoverFilters,
  { limit, offset }: { limit: number; offset: number },
) {
  const sortBy = filters.sortBy || "newest";
  const includeCauses = filters.includeType !== "petitions";
  const includePetitions = filters.includeType !== "campaigns";

  // Causes and petitions come from separate tables, so DB-level pagination
  // on either one can't produce a correctly-paginated combined feed — fetch
  // a bounded candidate set (capped at DISCOVER_RESULT_CAP, which is small)
  // from each, merge, sort, and paginate here instead.
  const [causes, petitions] = await Promise.all([
    includeCauses
      ? listCauses({
          category: filters.category,
          search: filters.search,
          location: filters.location,
          urgentOnly: filters.urgentOnly,
          verifiedOnly: filters.verifiedOnly,
          minAmountNeeded: filters.minAmountNeeded,
          maxAmountNeeded: filters.maxAmountNeeded,
          limit: DISCOVER_RESULT_CAP,
        })
      : Promise.resolve([]),
    includePetitions
      ? listPetitions({
          category: filters.category,
          search: filters.search,
          verifiedOnly: filters.verifiedOnly,
          limit: DISCOVER_RESULT_CAP,
        })
      : Promise.resolve([]),
  ]);

  let items: DiscoverItem[] = [
    ...causes.map(causeToItem),
    ...petitions.map(petitionToItem),
  ];

  if (filters.nearGoalOnly) {
    items = items.filter((i) => i.percent >= 90 && i.percent < 100);
  }

  items.sort((a, b) => compareItems(a, b, sortBy));

  const cappedTotal = Math.min(items.length, DISCOVER_RESULT_CAP);
  const page = items.slice(offset, offset + limit);

  return { items: page, hasMore: offset + page.length < cappedTotal };
}

export async function countDiscoverResults(
  filters: DiscoverFilters,
): Promise<number> {
  const includeCauses = filters.includeType !== "petitions";
  const includePetitions = filters.includeType !== "campaigns";

  const [causeCount, petitionCount] = await Promise.all([
    includeCauses
      ? countCauses({
          category: filters.category,
          search: filters.search,
          location: filters.location,
          urgentOnly: filters.urgentOnly,
          verifiedOnly: filters.verifiedOnly,
          minAmountNeeded: filters.minAmountNeeded,
          maxAmountNeeded: filters.maxAmountNeeded,
        })
      : Promise.resolve(0),
    includePetitions
      ? countPetitions({
          category: filters.category,
          search: filters.search,
          verifiedOnly: filters.verifiedOnly,
        })
      : Promise.resolve(0),
  ]);

  // "Near its goal" isn't a DB predicate (percent is computed) — approximate
  // by falling back to the full count when that filter is active; the grid
  // reflects the true count once results are actually fetched.
  return causeCount + petitionCount;
}

/**
 * For the empty state: re-count with a single active filter dropped, so the
 * UI can say "Remove Kano gives you 12 results" with a real number. Returns
 * the filter key whose removal unblocks the most results.
 */
export async function suggestFilterToRemove(
  filters: DiscoverFilters,
  activeKeys: (keyof DiscoverFilters)[],
) {
  if (activeKeys.length === 0) return null;

  const counts = await Promise.all(
    activeKeys.map(async (key) => {
      const relaxed = { ...filters, [key]: undefined };
      const count = await countDiscoverResults(relaxed);
      return { key, count };
    }),
  );

  return counts.reduce((best, current) =>
    current.count > best.count ? current : best,
  );
}

/**
 * Per-category result counts for the filter rail's live-count checkboxes.
 * Category is a single-select filter at the data layer (`listCauses`/
 * `listPetitions` both take `category?: string`), so this counts each
 * category with the *other* active filters held constant, not combinations
 * of categories.
 */
export async function getDiscoverFacets(
  filters: Omit<DiscoverFilters, "category">,
  categoryIds: string[],
) {
  const counts = await Promise.all(
    categoryIds.map(async (id) => ({
      category: id,
      count: await countDiscoverResults({ ...filters, category: id }),
    })),
  );
  return counts;
}

export async function searchDiscover(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return { campaigns: [], petitions: [], organizations: [], totalCount: 0 };

  const [campaigns, petitions, organizations, campaignCount, petitionCount] =
    await Promise.all([
      listCauses({ search: trimmed, limit: 4 }),
      listPetitions({ search: trimmed, limit: 4 }),
      searchOrganizations(trimmed, 4),
      countCauses({ search: trimmed }),
      countPetitions({ search: trimmed }),
    ]);

  return {
    campaigns: campaigns.map(causeToItem),
    petitions: petitions.map(petitionToItem),
    organizations,
    totalCount: campaignCount + petitionCount + organizations.length,
  };
}
