import type { DiscoverFilters } from "@/actions/discover-actions";
import { getCampaignCategoryStyle } from "@/lib/campaign-categories";

export type FilterKey =
  | "categories"
  | "location"
  | "urgentOnly"
  | "nearGoalOnly"
  | "verifiedOnly"
  | "amount";

export type FilterChip = {
  key: FilterKey;
  /** Set for category chips: removing one category keeps the others. */
  value?: string;
  label: string;
};

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven"];

export const countWord = (n: number) => WORDS[n] ?? String(n);

/** ₦12.4M, ₦450,000 — compact for millions, exact below. */
export function formatNairaShort(value: number) {
  if (value >= 1_000_000) {
    return `₦${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  return `₦${Math.round(value).toLocaleString()}`;
}

function amountLabel(min?: number, max?: number) {
  if (min != null && max != null)
    return `${formatNairaShort(min)}–${formatNairaShort(max)} to go`;
  if (max != null) return `Under ${formatNairaShort(max)} to go`;
  if (min != null) return `Over ${formatNairaShort(min)} to go`;
  return null;
}

const categoryName = (id: string) => getCampaignCategoryStyle(id).name;

function joinWords(parts: string[]) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

export function filterChips(filters: DiscoverFilters): FilterChip[] {
  const chips: FilterChip[] = (filters.categories ?? []).map((id) => ({
    key: "categories",
    value: id,
    label: categoryName(id),
  }));
  if (filters.location)
    chips.push({ key: "location", label: filters.location });
  if (filters.urgentOnly)
    chips.push({ key: "urgentOnly", label: "Urgent only" });
  if (filters.nearGoalOnly)
    chips.push({ key: "nearGoalOnly", label: "Near its goal" });
  if (filters.verifiedOnly)
    chips.push({ key: "verifiedOnly", label: "Verified NGOs" });
  const amount = amountLabel(filters.minAmountNeeded, filters.maxAmountNeeded);
  if (amount) chips.push({ key: "amount", label: amount });
  return chips;
}

/** "Education and disaster relief in Lagos" */
export function filterSummary(filters: DiscoverFilters): string {
  const names = (filters.categories ?? []).map(categoryName);
  let subject = names.length
    ? joinWords(names.map((n, i) => (i === 0 ? n : n.toLowerCase())))
    : "All causes";
  if (filters.location) subject += ` in ${filters.location}`;

  const extras = [
    filters.urgentOnly && "urgent",
    filters.nearGoalOnly && "near their goal",
    filters.verifiedOnly && "from verified NGOs",
    amountLabel(
      filters.minAmountNeeded,
      filters.maxAmountNeeded,
    )?.toLowerCase(),
  ].filter(Boolean);

  return extras.length ? `${subject} · ${extras.join(" · ")}` : subject;
}

/**
 * The tail of "There are 154 water campaigns, but none in Kano marked
 * urgent." — every active filter except the causes.
 */
export function noneClause(filters: DiscoverFilters): string {
  return [
    filters.location && `in ${filters.location}`,
    filters.urgentOnly && "marked urgent",
    filters.nearGoalOnly && "near their goal",
    filters.verifiedOnly && "from verified NGOs",
    amountLabel(
      filters.minAmountNeeded,
      filters.maxAmountNeeded,
    )?.toLowerCase(),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Returns filters with one chip's filter removed. */
export function withoutChip(
  filters: DiscoverFilters,
  chip: Pick<FilterChip, "key" | "value">,
): DiscoverFilters {
  const next = { ...filters };
  switch (chip.key) {
    case "categories": {
      const rest = (next.categories ?? []).filter((id) => id !== chip.value);
      next.categories = chip.value && rest.length ? rest : undefined;
      break;
    }
    case "amount":
      delete next.minAmountNeeded;
      delete next.maxAmountNeeded;
      break;
    default:
      delete next[chip.key];
  }
  return next;
}
