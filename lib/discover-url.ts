import type { DiscoverFilters, DiscoverSort } from "@/actions/discover-actions";
import type { DiscoverTab } from "@/components/discover/discover-tabs";

const VALID_TABS: DiscoverTab[] = [
  "all",
  "for-you",
  "urgent",
  "closing-soon",
  "petitions",
  "new",
];
const VALID_SORTS: DiscoverSort[] = [
  "most-urgent",
  "closest-to-goal",
  "newest",
  "most-given",
  "closing-soonest",
];
const VALID_TYPES = ["all", "campaigns", "petitions"] as const;

export type DiscoverSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Reconstructs the active tab + filters from a URL's query string — used
 * server-side (app/causes/page.tsx) to build the initial state and
 * client-side (DiscoverPageClient) to restore state on back/forward
 * navigation, so a shared or refreshed Discover link keeps its filters.
 */
export function parseDiscoverSearchParams(params: DiscoverSearchParams): {
  tab: DiscoverTab;
  filters: DiscoverFilters;
} {
  const tabRaw = first(params.tab);
  const tab = (VALID_TABS as string[]).includes(tabRaw || "") ? (tabRaw as DiscoverTab) : "all";

  const sortRaw = first(params.sort);
  const sortBy = (VALID_SORTS as string[]).includes(sortRaw || "") ? (sortRaw as DiscoverSort) : "newest";

  const typeRaw = first(params.type);
  const includeType = (VALID_TYPES as readonly string[]).includes(typeRaw || "")
    ? (typeRaw as (typeof VALID_TYPES)[number])
    : undefined;

  const minAmountRaw = first(params.minAmount);
  const maxAmountRaw = first(params.maxAmount);
  const minAmountNeeded = minAmountRaw ? Number(minAmountRaw) : undefined;
  const maxAmountNeeded = maxAmountRaw ? Number(maxAmountRaw) : undefined;

  const filters: DiscoverFilters = {
    search: first(params.q) || undefined,
    category: first(params.category) || undefined,
    location: first(params.location) || undefined,
    urgentOnly: first(params.urgent) === "1" || undefined,
    verifiedOnly: first(params.verified) === "1" || undefined,
    nearGoalOnly: first(params.nearGoal) === "1" || undefined,
    minAmountNeeded: Number.isFinite(minAmountNeeded) ? minAmountNeeded : undefined,
    maxAmountNeeded: Number.isFinite(maxAmountNeeded) ? maxAmountNeeded : undefined,
    includeType,
    sortBy,
  };

  return { tab, filters };
}

/** Inverse of parseDiscoverSearchParams — serializes tab + filters back into a clean query string (defaults omitted). */
export function buildDiscoverSearchParams(tab: DiscoverTab, filters: DiscoverFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (tab !== "all") params.set("tab", tab);
  if (filters.search) params.set("q", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.location) params.set("location", filters.location);
  if (filters.urgentOnly) params.set("urgent", "1");
  if (filters.verifiedOnly) params.set("verified", "1");
  if (filters.nearGoalOnly) params.set("nearGoal", "1");
  if (filters.minAmountNeeded != null) params.set("minAmount", String(filters.minAmountNeeded));
  if (filters.maxAmountNeeded != null) params.set("maxAmount", String(filters.maxAmountNeeded));
  if (filters.includeType && filters.includeType !== "all") params.set("type", filters.includeType);
  if (filters.sortBy && filters.sortBy !== "newest") params.set("sort", filters.sortBy);

  return params;
}
