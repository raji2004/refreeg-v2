"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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

const CATEGORY_IDS = campaignCategoryStyles.map((c) => c.id);

export function DiscoverPageClient({
  initialTab,
  initialFilters,
  initialItems,
  initialHasMore,
  initialFacets,
}: {
  initialTab: DiscoverTab;
  initialFilters: DiscoverFilters;
  initialItems: DiscoverItem[];
  initialHasMore: boolean;
  initialFacets: { category: string; count: number }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<DiscoverTab>(initialTab);
  const [filters, setFilters] = useState<DiscoverFilters>(initialFilters);
  const [sortBy, setSortBy] = useState<DiscoverSortType>(initialFilters.sortBy || "newest");
  const [facets, setFacets] = useState(initialFacets);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<DiscoverFilters>(initialFilters);
  const [draftCount, setDraftCount] = useState<number | null>(null);

  const activeFilters = useMemo<DiscoverFilters>(
    () => ({ ...filters, sortBy }),
    [filters, sortBy],
  );

  useEffect(() => {
    const { category, ...rest } = activeFilters;
    getDiscoverFacets(rest, CATEGORY_IDS)
      .then(setFacets)
      .catch(() => {
        // Non-critical — category counts just won't update this pass.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify({ ...activeFilters, category: undefined })]);

  // Keep the URL in sync so a shared or refreshed Discover link restores
  // the same tab/filters/sort instead of resetting to defaults.
  useEffect(() => {
    const params = buildDiscoverSearchParams(tab, activeFilters);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, JSON.stringify(activeFilters)]);

  // Mobile filter sheet: changes apply to a draft copy only, committed to
  // the real (fetch-triggering) filters when "Show N results" is tapped —
  // spec calls for a deferred apply, not the live-apply the desktop rail
  // rendered in the sheet used to do.
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

  const handleRemoveFilter = (key: keyof DiscoverFilters) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleClearFilters = () => {
    setFilters((prev) => ({ search: prev.search }));
    setTab("all");
    setSortBy("newest");
  };

  const handleDraftFilterChange = (patch: Partial<DiscoverFilters>) => {
    setDraftFilters((prev) => ({ ...prev, ...patch }));
  };

  const handleClearDraftFilters = () => {
    setDraftFilters((prev) => ({ search: prev.search }));
  };

  const applyDraftFilters = () => {
    setFilters(draftFilters);
    setMobileFiltersOpen(false);
  };

  return (
    <div className="bg-cream">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-6">
          <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">
            Discover
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink/60 md:text-base">
            Campaigns and petitions powered by real people, verified for
            transparency, and built for impact. Press{" "}
            <kbd className="rounded border border-ink/15 bg-cream px-1.5 py-0.5 text-xs">
              ⌘K
            </kbd>{" "}
            to search.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <DiscoverTabs active={tab} onChange={handleTabChange} />
          <div className="flex items-center gap-2">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl bg-cream p-0"
              >
                <SheetHeader className="border-b border-ink/10 px-4 py-3">
                  <SheetTitle className="font-fraunces">Filters</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <DiscoverFilterRail
                    filters={draftFilters}
                    onChange={handleDraftFilterChange}
                    onClear={handleClearDraftFilters}
                    facets={facets}
                  />
                </div>
                <div className="border-t border-ink/10 px-4 py-3">
                  <Button variant="ink" className="w-full" onClick={applyDraftFilters}>
                    {draftCount == null
                      ? "Show results"
                      : `Show ${draftCount} result${draftCount === 1 ? "" : "s"}`}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <DiscoverSort value={sortBy} onChange={setSortBy} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-ink/10 bg-white/60 p-5">
              <DiscoverFilterRail
                filters={filters}
                onChange={handleFilterChange}
                onClear={handleClearFilters}
                facets={facets}
              />
            </div>
          </aside>

          <div>
            <DiscoverGrid
              filters={activeFilters}
              initialItems={initialItems}
              initialHasMore={initialHasMore}
              onRemoveFilter={handleRemoveFilter}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
