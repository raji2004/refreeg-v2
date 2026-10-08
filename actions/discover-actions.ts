"use server";

import {
  listCauses,
  countCauses,
  countCausesByCategory,
} from "./cause-actions";
import {
  listPetitions,
  countPetitions,
  countPetitionsByCategory,
} from "./petition-actions";
import { searchOrganizations } from "./organization-actions";
import type { Cause } from "@/types/cause-types";
import type { Petition } from "@/types/petition-types";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  filterChips,
  withoutChip,
  type FilterChip,
} from "@/lib/discover-summary";
import {
  DISCOVER_CACHE_SECONDS,
  DISCOVER_CACHE_TAG,
  DISCOVER_RESULT_CAP,
} from "@/lib/discover-constants";

export type DiscoverSort =
  | "most-urgent"
  | "closest-to-goal"
  | "newest"
  | "most-given"
  | "closing-soonest";

export interface DiscoverFilters {
  categories?: string[];
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

  paused: boolean;
  createdAt: string;
  /** Completed donations; null for petitions. */
  giftCount: number | null;
}

function compareItems(
  a: DiscoverItem,
  b: DiscoverItem,
  sortBy: DiscoverSort,
): number {
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

import { calculateDaysLeft } from "@/utils/cause/cause-utils";

function causeToItem(cause: Cause): DiscoverItem {
  const daysLeft = calculateDaysLeft(cause as any);
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
    giftCount: null,
  };
}

function petitionToItem(petition: Petition): DiscoverItem {
  const daysLeft =
    petition.days_active != null
      ? Math.max(
          0,
          petition.days_active -
            (petition.created_at
              ? Math.floor(
                  (Date.now() - new Date(petition.created_at).getTime()) /
                    (1000 * 60 * 60 * 24),
                )
              : 0),
        )
      : null;
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
    daysLeft,
    urgent: daysLeft != null && daysLeft <= 7,
    location: null,
    paused: false,
    createdAt: petition.created_at,
    giftCount: null,
  };
}

// Only the fields that change what the database returns. Sorting and
// near-goal filtering happen afterwards, so they must not split the cache.
function queryFilters(filters: DiscoverFilters) {
  return {
    // Sorted so the same set in a different order shares a cache entry.
    categories: filters.categories?.length
      ? [...filters.categories].sort()
      : undefined,
    location: filters.location,
    urgentOnly: filters.urgentOnly,
    verifiedOnly: filters.verifiedOnly,
    minAmountNeeded: filters.minAmountNeeded,
    maxAmountNeeded: filters.maxAmountNeeded,
    includeType: filters.includeType,
    search: filters.search,
  };
}

type QueryFilters = ReturnType<typeof queryFilters>;

// Free-text searches are high-cardinality and would fill the cache with
// one-off entries, so they always hit the database.
function cachedByArgs<I extends { search?: string }, T>(
  name: string,
  run: (args: I) => Promise<T>,
) {
  const cached = unstable_cache(
    (json: string) => run(JSON.parse(json) as I),
    [name],
    { revalidate: DISCOVER_CACHE_SECONDS, tags: [DISCOVER_CACHE_TAG] },
  );
  return (args: I) =>
    args.search?.trim() ? run(args) : cached(JSON.stringify(args));
}

const getCappedItems = cachedByArgs(
  "discover-capped-items",
  async (filters: QueryFilters): Promise<DiscoverItem[]> => {
    const includeCauses = filters.includeType !== "petitions";
    const includePetitions = filters.includeType !== "campaigns";

    const [causes, petitions] = await Promise.all([
      includeCauses
        ? listCauses({
            categories: filters.categories,
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
            categories: filters.categories,
            search: filters.search,
            verifiedOnly: filters.verifiedOnly,
            limit: DISCOVER_RESULT_CAP,
          })
        : Promise.resolve([]),
    ]);

    return [...causes.map(causeToItem), ...petitions.map(petitionToItem)];
  },
);

export async function listDiscoverResults(
  filters: DiscoverFilters,
  { limit, offset }: { limit: number; offset: number },
) {
  const sortBy = filters.sortBy || "newest";

  let items: DiscoverItem[] = [
    ...(await getCappedItems(queryFilters(filters))),
  ];

  if (filters.nearGoalOnly) {
    items = items.filter((i) => i.percent >= 90 && i.percent < 100);
  }

  items.sort((a, b) => compareItems(a, b, sortBy));

  const cappedTotal = Math.min(items.length, DISCOVER_RESULT_CAP);
  const page = items.slice(offset, offset + limit);
  const giftCounts = await countGifts(
    page.filter((i) => i.type === "campaign").map((i) => i.id),
  );

  return {
    items: page.map((i) =>
      i.type === "campaign" ? { ...i, giftCount: giftCounts[i.id] ?? 0 } : i,
    ),
    hasMore: offset + page.length < cappedTotal,
  };
}

const getResultCount = cachedByArgs(
  "discover-result-count",
  async (filters: QueryFilters): Promise<number> => {
    const includeCauses = filters.includeType !== "petitions";
    const includePetitions = filters.includeType !== "campaigns";

    const [causeCount, petitionCount] = await Promise.all([
      includeCauses
        ? countCauses({
            categories: filters.categories,
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
            categories: filters.categories,
            search: filters.search,
            verifiedOnly: filters.verifiedOnly,
          })
        : Promise.resolve(0),
    ]);

    return causeCount + petitionCount;
  },
);

export async function countDiscoverResults(
  filters: DiscoverFilters,
): Promise<number> {
  // "Near its goal" is applied after the query, so count it the same way.
  if (filters.nearGoalOnly) {
    const items = await getCappedItems(queryFilters(filters));
    return items.filter((i) => i.percent >= 90 && i.percent < 100).length;
  }
  return getResultCount(queryFilters(filters));
}

/**
 * Why a filter set has no results: the one filter whose removal brings back
 * the most results, and how many campaigns the chosen causes have on their
 * own (for "There are 154 water campaigns, but none in Kano").
 */
export async function explainNoResults(filters: DiscoverFilters): Promise<{
  suggestion: (FilterChip & { count: number }) | null;
  causeOnlyCount: number | null;
}> {
  const chips = filterChips(filters);
  const otherChips = chips.filter((c) => c.key !== "categories");
  const hasCauses = !!filters.categories?.length;

  // Removing any single cause drops all of them from the explanation, so
  // offer the causes as one suggestion rather than one per category.
  const candidates: FilterChip[] = [
    ...otherChips,
    ...(hasCauses ? [{ key: "categories" as const, label: "" }] : []),
  ];

  const [counts, causeOnlyCount] = await Promise.all([
    Promise.all(
      candidates.map((chip) =>
        countDiscoverResults(withoutChip(filters, { key: chip.key })),
      ),
    ),
    hasCauses && otherChips.length
      ? countDiscoverResults({
          categories: filters.categories,
          search: filters.search,
          includeType: filters.includeType,
        })
      : Promise.resolve(null),
  ]);

  let best: (FilterChip & { count: number }) | null = null;
  candidates.forEach((chip, i) => {
    if (counts[i] > 0 && (!best || counts[i] > best.count)) {
      best = { ...chip, count: counts[i] };
    }
  });

  return { suggestion: best, causeOnlyCount };
}

const computeFacets = cachedByArgs(
  "discover-facets",
  async (
    args: Omit<QueryFilters, "categories"> & { categoryIds: string[] },
  ) => {
    const includeCauses = args.includeType !== "petitions";
    const includePetitions = args.includeType !== "campaigns";

    const [causeCounts, petitionCounts] = await Promise.all([
      includeCauses
        ? countCausesByCategory({
            search: args.search,
            location: args.location,
            urgentOnly: args.urgentOnly,
            verifiedOnly: args.verifiedOnly,
            minAmountNeeded: args.minAmountNeeded,
            maxAmountNeeded: args.maxAmountNeeded,
          })
        : Promise.resolve({} as Record<string, number>),
      includePetitions
        ? countPetitionsByCategory({
            search: args.search,
            verifiedOnly: args.verifiedOnly,
          })
        : Promise.resolve({} as Record<string, number>),
    ]);

    return args.categoryIds.map((id) => ({
      category: id,
      count: (causeCounts[id] ?? 0) + (petitionCounts[id] ?? 0),
    }));
  },
);

export async function getDiscoverFacets(
  filters: Omit<DiscoverFilters, "categories">,
  categoryIds: string[],
) {
  const { categories: _categories, ...scoped } = queryFilters(filters);
  return computeFacets({ ...scoped, categoryIds });
}

export async function searchDiscover(query: string) {
  const trimmed = query.trim();
  if (!trimmed)
    return { campaigns: [], petitions: [], organizations: [], totalCount: 0 };

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

async function countGifts(causeIds: string[]): Promise<Record<string, number>> {
  if (causeIds.length === 0) return {};
  const grouped = await prisma.donation.groupBy({
    by: ["causeId"],
    _count: { causeId: true },
    where: { causeId: { in: causeIds }, status: "completed" },
  });
  return Object.fromEntries(grouped.map((g) => [g.causeId, g._count.causeId]));
}

/** Rounds up to a clean slider step: whole millions, else hundred-thousands. */
function niceCeiling(value: number) {
  if (value <= 0) return 1_000_000;
  const step = value >= 1_000_000 ? 1_000_000 : 100_000;
  return Math.ceil(value / step) * step;
}

const computeRailData = unstable_cache(
  async () => {
    const open = await prisma.cause.findMany({
      where: { status: "approved", paused: false, compliance_paused: false },
      select: { location: true, goal: true, raised: true },
    });

    const cityCounts = new Map<string, number>();
    let maxNeeded = 0;
    for (const cause of open) {
      const city = cause.location?.split(",")[0]?.trim();
      if (city) cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
      const needed = Number(cause.goal || 0) - Number(cause.raised || 0);
      if (needed > maxNeeded) maxNeeded = needed;
    }

    return {
      topCities: [...cityCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name),
      amountCeiling: niceCeiling(maxNeeded),
    };
  },
  ["discover-rail-data"],
  { revalidate: DISCOVER_CACHE_SECONDS, tags: [DISCOVER_CACHE_TAG] },
);

/** Quick-pick cities and the amount slider's upper bound, from open campaigns. */
export async function getDiscoverRailData(): Promise<{
  topCities: string[];
  amountCeiling: number;
}> {
  return computeRailData();
}
