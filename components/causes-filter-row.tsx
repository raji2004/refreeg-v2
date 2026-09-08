"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { FilterSideNav } from "@/components/filter-side-nav";

interface CausesFilterRowProps {
  className?: string;
}

export default function CausesFilterRow({ className }: CausesFilterRowProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const search = searchParams.get("search") || "";

  const sortBy = searchParams.get("recommended") || "most-funded";

  const [searchInput, setSearchInput] = useState(search);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsFilterOpen(searchParams.get("filter") === "true");
  }, [searchParams]);

  // Sync search input when URL changes externally
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  /**
   * Push new params to the URL, always resetting to page 1.
   */
  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());

      // Always reset to page 1 when filters change
      next.delete("page");

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }

      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, router, pathname],
  );

  /**
   * Debounced search — waits 400ms after last keystroke before navigating.
   */
  const handleSearchChange = (value: string) => {
    setSearchInput(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      pushParams({ search: value || undefined });
    }, 400);
  };

  const clearSearch = () => {
    setSearchInput("");
    pushParams({ search: undefined });
  };

  const handleSortChange = (value: string) => {
    // If they select "most-funded" (our new default), we can actually omit it from the URL
    // to keep URLs clean, OR keep it explicit. Let's keep it explicit so the URL reflects the state.
    pushParams({ recommended: value });
  };

  const handleFilterToggle = (open: boolean) => {
    setIsFilterOpen(open);
    const next = new URLSearchParams(searchParams.toString());
    if (open) next.set("filter", "true");
    else next.delete("filter");
    const newUrl = `${pathname}?${next.toString()}`;
    window.history.replaceState({}, "", newUrl);
  };

  return (
    <>
      <div className={className}>
        <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: Filter + Search */}
          <div className="flex items-center gap-2 flex-1">
            {/* Filter button */}
            <div className="flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full px-4 h-10"
                onClick={() => handleFilterToggle(true)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>

            {/* Search input */}
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                placeholder="Search causes by title..."
                className="pl-9 pr-9 w-full rounded-full h-10"
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {searchInput && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Sort select */}
          <div className="w-full sm:w-auto">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full sm:w-[170px] rounded-full h-10">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most-funded">Most Funded</SelectItem>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="ending-soon">Ending Soon</SelectItem>
                <SelectItem value="recommended">Recommended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Filter Side Navigation */}
      <FilterSideNav
        isOpen={isFilterOpen}
        onClose={() => handleFilterToggle(false)}
      />
    </>
  );
}
