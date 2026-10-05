"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DiscoverFilterRail } from "./discover-filter-rail";
import { DiscoverTabs, presetForTab, type DiscoverTab } from "./discover-tabs";
import { DiscoverSort } from "./discover-sort";
import { DiscoverGrid } from "./discover-grid";
import { campaignCategoryStyles } from "@/lib/campaign-categories";
import {
  getDiscoverFacets,
  countDiscoverResults,
  type DiscoverFilters,
  type DiscoverItem,
  type DiscoverSort as DiscoverSortType,
} from "@/actions/discover-actions";
import { buildDiscoverSearchParams } from "@/lib/discover-url";
import {
  filterChips,
  filterSummary,
  withoutChip,
  type FilterChip,
} from "@/lib/discover-summary";

const CATEGORY_IDS = campaignCategoryStyles.map((c) => c.id);
const VIEW_STORAGE_KEY = "discover:view";

function updatedAgo(loadedAt: number, now: number) {
  const minutes = Math.floor((now - loadedAt) / 60_000);
  if (minutes < 1) return "updated just now";
  if (minutes < 60)
    return `updated ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  return `updated ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "grid" | "list";
  onChange: (view: "grid" | "list") => void;
}) {
  const option = (value: "grid" | "list", label: string, Icon: typeof List) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={view === value}
      onClick={() => onChange(value)}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
        view === value
          ? "bg-surface text-ink shadow-sm"
          : "text-ink/45 hover:text-ink",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
  return (
    <div className="flex items-center gap-0.5 rounded-xl bg-cream-muted p-1">
      {option("grid", "Grid view", LayoutGrid)}
      {option("list", "List view", List)}
    </div>
  );
}

function FilterChipsRow({
  chips,
  onRemove,
}: {
  chips: FilterChip[];
  onRemove: (chip: FilterChip) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span
          key={`${chip.key}:${chip.value ?? ""}`}
          className="inline-flex items-center gap-2 rounded-full bg-cream-muted py-1.5 pl-3.5 pr-2 text-[13px] font-semibold text-ink"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remove ${chip.label}`}
            onClick={() => onRemove(chip)}
            className="flex h-5 w-5 items-center justify-center rounded-full text-ink/55 hover:bg-ink/10 hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

export function DiscoverPageClient({
  initialTab,
  initialFilters,
  initialItems,
  initialHasMore,
  initialFacets,
  initialBookmarks,
  initialTotal,
  topCities,
  amountCeiling,
}: {
  initialTab: DiscoverTab;
  initialFilters: DiscoverFilters;
  initialItems: DiscoverItem[];
  initialHasMore: boolean;
  initialFacets: { category: string; count: number }[];
  initialBookmarks: string[];
  initialTotal: number;
  topCities: string[];
  amountCeiling: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<DiscoverTab>(initialTab);
  const [filters, setFilters] = useState<DiscoverFilters>(initialFilters);
  const [sortBy, setSortBy] = useState<DiscoverSortType>(
    initialFilters.sortBy || "newest",
  );
  const [facets, setFacets] = useState(initialFacets);
  const [total, setTotal] = useState(initialTotal);
  const [isEmpty, setIsEmpty] = useState(initialItems.length === 0);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] =
    useState<DiscoverFilters>(initialFilters);
  const [draftCount, setDraftCount] = useState<number | null>(null);

  const activeFilters = useMemo<DiscoverFilters>(
    () => ({ ...filters, sortBy }),
    [filters, sortBy],
  );
  const chips = filterChips(activeFilters);

  // "updated N minutes ago" counts from when the results were loaded.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (stored === "grid" || stored === "list") setView(stored);
    } catch {}
  }, []);

  const changeView = (next: "grid" | "list") => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {}
  };

  const facetsKey = JSON.stringify({ ...activeFilters, categories: undefined });
  const lastFacetsKey = useRef(facetsKey);
  useEffect(() => {
    // The server already rendered facets for the initial filters.
    if (facetsKey === lastFacetsKey.current) return;
    lastFacetsKey.current = facetsKey;
    const { categories: _categories, ...rest } = activeFilters;
    getDiscoverFacets(rest, CATEGORY_IDS)
      .then(setFacets)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facetsKey]);

  const countKey = JSON.stringify({ ...activeFilters, sortBy: undefined });
  const lastCountKey = useRef(countKey);
  useEffect(() => {
    if (countKey === lastCountKey.current) return;
    lastCountKey.current = countKey;
    let cancelled = false;
    countDiscoverResults(activeFilters)
      .then((count) => !cancelled && setTotal(count))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countKey]);

  useEffect(() => {
    const params = buildDiscoverSearchParams(tab, activeFilters);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, JSON.stringify(activeFilters)]);

  // Mobile sheet edits a draft, applied with "Show N results".
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    setDraftFilters(filters);
  }, [mobileFiltersOpen, filters]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    let cancelled = false;
    countDiscoverResults(draftFilters).then((count) => {
      if (!cancelled) setDraftCount(count);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileFiltersOpen, JSON.stringify(draftFilters)]);

  const handleTabChange = (next: DiscoverTab) => {
    setTab(next);
    const preset = presetForTab(next);
    setFilters((prev) => ({ ...prev, ...preset.filters }));
    setSortBy(preset.sortBy);
  };

  const handleFilterChange = (patch: Partial<DiscoverFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const replaceFilters = (next: DiscoverFilters) => {
    const { sortBy: _sortBy, ...rest } = next;
    setFilters(rest);
  };

  const handleClearFilters = () => {
    setFilters((prev) => ({ search: prev.search }));
    setTab("all");
    setSortBy("newest");
  };

  const noun =
    activeFilters.includeType === "petitions" ? "petition" : "campaign";
  const title =
    chips.length > 0
      ? `${total.toLocaleString()} ${noun}${total === 1 ? "" : "s"}`
      : noun === "petition"
        ? "Petitions to sign"
        : "Campaigns to fund";
  const subtitle =
    chips.length > 0
      ? filterSummary(activeFilters)
      : `${total.toLocaleString()} open ${noun}${total === 1 ? "" : "s"} · ${updatedAgo(loadedAt, now)}`;
  const showNoResultsLayout = isEmpty && chips.length > 0;

  const mobileFilters = (
    <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="h-11 gap-2 rounded-xl border-hairline bg-surface lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {chips.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-bold text-ink-foreground">
              {chips.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl bg-cream p-0"
      >
        <SheetHeader className="border-b border-hairline px-4 py-3">
          <SheetTitle className="font-fraunces">Filters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <DiscoverFilterRail
            filters={draftFilters}
            onChange={(patch) =>
              setDraftFilters((prev) => ({ ...prev, ...patch }))
            }
            onClear={() => setDraftFilters((prev) => ({ search: prev.search }))}
            facets={facets}
            topCities={topCities}
            amountCeiling={amountCeiling}
          />
        </div>
        <div className="border-t border-hairline px-4 py-3">
          <Button
            variant="ink"
            className="h-11 w-full rounded-xl"
            onClick={() => {
              setFilters(draftFilters);
              setMobileFiltersOpen(false);
            }}
          >
            {draftCount == null
              ? "Show results"
              : `Show ${draftCount} result${draftCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[188px_minmax(0,1fr)] xl:gap-14">
        <aside className="hidden lg:block">
          <div className="sticky top-6 pt-2">
            <DiscoverFilterRail
              filters={filters}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
              facets={facets}
              topCities={topCities}
              amountCeiling={amountCeiling}
              compact={showNoResultsLayout}
            />
          </div>
        </aside>

        <div className="min-w-0">
          {showNoResultsLayout ? (
            <div className="flex items-start justify-between gap-3">
              <FilterChipsRow
                chips={chips}
                onRemove={(chip) =>
                  replaceFilters(withoutChip(activeFilters, chip))
                }
              />
              {mobileFilters}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="font-fraunces text-4xl tracking-tight text-ink sm:text-[40px] sm:leading-tight">
                    {title}
                  </h1>
                  <p className="mt-2 text-sm text-ink/60">{subtitle}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {mobileFilters}
                  <DiscoverSort value={sortBy} onChange={setSortBy} />
                  <ViewToggle view={view} onChange={changeView} />
                </div>
              </div>

              <div className="mt-6">
                {chips.length > 0 ? (
                  <FilterChipsRow
                    chips={chips}
                    onRemove={(chip) =>
                      replaceFilters(withoutChip(activeFilters, chip))
                    }
                  />
                ) : (
                  <DiscoverTabs active={tab} onChange={handleTabChange} />
                )}
              </div>
            </>
          )}

          <div className="mt-5">
            <DiscoverGrid
              filters={activeFilters}
              view={view}
              initialItems={initialItems}
              initialHasMore={initialHasMore}
              initialBookmarks={initialBookmarks}
              onFiltersChange={replaceFilters}
              onClearFilters={handleClearFilters}
              onLoaded={() => {
                setLoadedAt(Date.now());
                setNow(Date.now());
              }}
              onEmptyChange={setIsEmpty}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
