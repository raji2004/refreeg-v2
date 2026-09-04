"use client";

import { useEffect, useMemo, useState } from "react";
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
  type DiscoverFilters,
  type DiscoverItem,
  type DiscoverSort as DiscoverSortType,
} from "@/actions/discover-actions";

const CATEGORY_IDS = campaignCategoryStyles.map((c) => c.id);

export function DiscoverPageClient({
  initialFilters,
  initialItems,
  initialHasMore,
  initialFacets,
}: {
  initialFilters: DiscoverFilters;
  initialItems: DiscoverItem[];
  initialHasMore: boolean;
  initialFacets: { category: string; count: number }[];
}) {
  const [tab, setTab] = useState<DiscoverTab>("all");
  const [filters, setFilters] = useState<DiscoverFilters>(initialFilters);
  const [sortBy, setSortBy] = useState<DiscoverSortType>(initialFilters.sortBy || "newest");
  const [facets, setFacets] = useState(initialFacets);

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
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] overflow-y-auto bg-cream sm:w-[340px]">
                <SheetHeader>
                  <SheetTitle className="font-fraunces">Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <DiscoverFilterRail
                    filters={filters}
                    onChange={handleFilterChange}
                    onClear={handleClearFilters}
                    facets={facets}
                  />
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
