"use client";

import { useEffect, useState } from "react";
import { ChevronDown, MapPin, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eyebrow } from "@/components/ui/eyebrow";
import { campaignCategoryStyles } from "@/lib/campaign-categories";
import { useDebounce } from "@/hooks/use-debounce";
import type { DiscoverFilters } from "@/actions/discover-actions";

const inkCheckbox =
  "border-ink/40 data-[state=checked]:bg-ink data-[state=checked]:border-ink data-[state=checked]:text-ink-foreground";

const VISIBLE_CATEGORY_COUNT = 5;
const AMOUNT_MIN = 0;
const AMOUNT_MAX = 5_000_000;
const AMOUNT_STEP = 50_000;

function formatNaira(value: number) {
  if (value >= AMOUNT_MAX) return `₦${(AMOUNT_MAX / 1_000_000).toFixed(0)}M+`;
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₦${Math.round(value / 1000)}k`;
  return `₦${value}`;
}

export function DiscoverFilterRail({
  filters,
  onChange,
  onClear,
  facets,
}: {
  filters: DiscoverFilters;
  onChange: (patch: Partial<DiscoverFilters>) => void;
  onClear: () => void;
  facets: { category: string; count: number }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [locationInput, setLocationInput] = useState(filters.location || "");
  const debouncedLocation = useDebounce(locationInput, 400);

  useEffect(() => {
    if (debouncedLocation !== (filters.location || "")) {
      onChange({ location: debouncedLocation || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLocation]);

  useEffect(() => {
    setLocationInput(filters.location || "");
  }, [filters.location]);

  // Dragging (or arrow-keying) the slider fires onValueChange on every
  // step — debounce before it triggers a fetch, same as location above,
  // instead of refetching on every pixel/keystroke.
  const [pendingAmountRange, setPendingAmountRange] = useState<[number, number]>([
    filters.minAmountNeeded ?? AMOUNT_MIN,
    filters.maxAmountNeeded ?? AMOUNT_MAX,
  ]);
  const debouncedAmountRange = useDebounce(pendingAmountRange, 400);

  useEffect(() => {
    const [min, max] = debouncedAmountRange;
    const nextMin = min > AMOUNT_MIN ? min : undefined;
    const nextMax = max < AMOUNT_MAX ? max : undefined;
    if (nextMin !== filters.minAmountNeeded || nextMax !== filters.maxAmountNeeded) {
      onChange({ minAmountNeeded: nextMin, maxAmountNeeded: nextMax });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAmountRange]);

  useEffect(() => {
    setPendingAmountRange([
      filters.minAmountNeeded ?? AMOUNT_MIN,
      filters.maxAmountNeeded ?? AMOUNT_MAX,
    ]);
  }, [filters.minAmountNeeded, filters.maxAmountNeeded]);

  const facetFor = (id: string) => facets.find((f) => f.category === id)?.count ?? null;
  const visibleCategories = expanded
    ? campaignCategoryStyles
    : campaignCategoryStyles.slice(0, VISIBLE_CATEGORY_COUNT);

  const amountRange = pendingAmountRange;

  const hasActiveFilters =
    !!filters.category ||
    !!filters.location ||
    !!filters.urgentOnly ||
    !!filters.verifiedOnly ||
    !!filters.nearGoalOnly ||
    filters.minAmountNeeded != null ||
    filters.maxAmountNeeded != null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto gap-1 px-2 py-1 text-xs text-muted-foreground"
            onClick={onClear}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2.5">
        <Eyebrow>Category</Eyebrow>
        <div className="space-y-2">
          {visibleCategories.map((cat) => {
            const count = facetFor(cat.id);
            const checked = filters.category === cat.id;
            const disabled = count === 0 && !checked;
            return (
              <label
                key={cat.id}
                className={`flex items-center justify-between gap-2 text-sm ${
                  disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    className={inkCheckbox}
                    onCheckedChange={(value) =>
                      onChange({ category: value ? cat.id : undefined })
                    }
                  />
                  <span className="text-ink/80">{cat.name}</span>
                </span>
                {count != null && (
                  <span className="text-xs text-muted-foreground">{count}</span>
                )}
              </label>
            );
          })}
        </div>
        {campaignCategoryStyles.length > VISIBLE_CATEGORY_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-ink underline underline-offset-2"
          >
            {expanded
              ? "Show less"
              : `Show ${campaignCategoryStyles.length - VISIBLE_CATEGORY_COUNT} more`}
            <ChevronDown
              className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Location */}
      <div className="space-y-2.5">
        <Eyebrow>Location</Eyebrow>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="City, state…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2.5">
        <Eyebrow>Status</Eyebrow>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/80">
            <Checkbox
              checked={!!filters.urgentOnly}
              className={inkCheckbox}
              onCheckedChange={(value) => onChange({ urgentOnly: !!value })}
            />
            Urgent only
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/80">
            <Checkbox
              checked={!!filters.nearGoalOnly}
              className={inkCheckbox}
              onCheckedChange={(value) => onChange({ nearGoalOnly: !!value })}
            />
            Near its goal
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/80">
            <Checkbox
              checked={!!filters.verifiedOnly}
              className={inkCheckbox}
              onCheckedChange={(value) => onChange({ verifiedOnly: !!value })}
            />
            Verified NGOs
          </label>
        </div>
      </div>

      {/* Amount still needed */}
      <div className="space-y-3">
        <Eyebrow>Amount still needed</Eyebrow>
        <Slider
          min={AMOUNT_MIN}
          max={AMOUNT_MAX}
          step={AMOUNT_STEP}
          value={amountRange}
          rangeClassName="bg-ink"
          thumbClassName="border-ink"
          onValueChange={([min, max]) => setPendingAmountRange([min, max])}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatNaira(amountRange[0])}</span>
          <span>{formatNaira(amountRange[1])}</span>
        </div>
      </div>
    </div>
  );
}
