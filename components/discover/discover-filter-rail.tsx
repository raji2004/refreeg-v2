"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Eyebrow } from "@/components/ui/eyebrow";
import { campaignCategoryStyles } from "@/lib/campaign-categories";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { filterChips, formatNairaShort } from "@/lib/discover-summary";
import type { DiscoverFilters } from "@/actions/discover-actions";

const inkCheckbox =
  "h-[18px] w-[18px] rounded-[5px] border-ink/25 data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-ink-foreground";

const VISIBLE_CATEGORY_COUNT = 4;
const AMOUNT_STEPS = 100;

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-hairline pt-6">
      <Eyebrow className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55">
        {label}
      </Eyebrow>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function CheckRow({
  label,
  checked,
  count,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  count?: number | null;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-2 py-[5px] text-sm",
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
      )}
    >
      <span className="flex items-center gap-3">
        <Checkbox
          checked={checked}
          disabled={disabled}
          className={inkCheckbox}
          onCheckedChange={(value) => onChange(!!value)}
        />
        <span className={checked ? "font-semibold text-ink" : "text-ink/80"}>
          {label}
        </span>
      </span>
      {count != null && (
        <span className="text-xs tabular-nums text-ink/45">{count}</span>
      )}
    </label>
  );
}

export function DiscoverFilterRail({
  filters,
  onChange,
  onClear,
  facets,
  topCities,
  amountCeiling,
  compact = false,
}: {
  filters: DiscoverFilters;
  onChange: (patch: Partial<DiscoverFilters>) => void;
  onClear: () => void;
  facets: { category: string; count: number }[];
  topCities: string[];
  amountCeiling: number;
  /** No results: show only the filters that are switched on. */
  compact?: boolean;
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

  // Debounced so dragging the slider doesn't refetch on every step.
  const [pendingAmountRange, setPendingAmountRange] = useState<
    [number, number]
  >([filters.minAmountNeeded ?? 0, filters.maxAmountNeeded ?? amountCeiling]);
  const debouncedAmountRange = useDebounce(pendingAmountRange, 400);

  useEffect(() => {
    const [min, max] = debouncedAmountRange;
    const nextMin = min > 0 ? min : undefined;
    const nextMax = max < amountCeiling ? max : undefined;
    if (
      nextMin !== filters.minAmountNeeded ||
      nextMax !== filters.maxAmountNeeded
    ) {
      onChange({ minAmountNeeded: nextMin, maxAmountNeeded: nextMax });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAmountRange]);

  useEffect(() => {
    setPendingAmountRange([
      filters.minAmountNeeded ?? 0,
      filters.maxAmountNeeded ?? amountCeiling,
    ]);
  }, [filters.minAmountNeeded, filters.maxAmountNeeded, amountCeiling]);

  const selected = filters.categories ?? [];
  const facetFor = (id: string) =>
    facets.find((f) => f.category === id)?.count ?? null;
  const toggleCategory = (id: string, on: boolean) => {
    const next = on ? [...selected, id] : selected.filter((c) => c !== id);
    onChange({ categories: next.length ? next : undefined });
  };
  const activeCount = filterChips(filters).length;

  const statusRows = [
    { key: "urgentOnly", label: "Urgent only" },
    { key: "nearGoalOnly", label: "Near its goal" },
    { key: "verifiedOnly", label: "Verified NGOs" },
  ] as const;

  const header = (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        Filters
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-bold text-ink-foreground">
            {activeCount}
          </span>
        )}
      </h2>
      <button
        type="button"
        onClick={onClear}
        disabled={activeCount === 0}
        className={cn(
          "text-[13px] font-medium",
          activeCount > 0
            ? "text-blue-accent hover:underline"
            : "cursor-default text-ink/45",
        )}
      >
        Clear
      </button>
    </div>
  );

  if (compact) {
    return (
      <div>
        {header}
        <div className="mt-4">
          {campaignCategoryStyles
            .filter((cat) => selected.includes(cat.id))
            .map((cat) => (
              <CheckRow
                key={cat.id}
                label={cat.name}
                checked
                count={facetFor(cat.id)}
                onChange={(on) => toggleCategory(cat.id, on)}
              />
            ))}
          {statusRows
            .filter((row) => filters[row.key])
            .map((row) => (
              <CheckRow
                key={row.key}
                label={row.label}
                checked
                count={0}
                onChange={(on) => onChange({ [row.key]: on || undefined })}
              />
            ))}
        </div>
      </div>
    );
  }

  const categories = expanded
    ? campaignCategoryStyles
    : campaignCategoryStyles.slice(0, VISIBLE_CATEGORY_COUNT);
  const hiddenCount = campaignCategoryStyles.length - VISIBLE_CATEGORY_COUNT;

  return (
    <div className="space-y-6">
      {header}

      <div>
        <Eyebrow className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55">
          Cause
        </Eyebrow>
        <div className="mt-3.5">
          {categories.map((cat) => {
            const count = facetFor(cat.id);
            const checked = selected.includes(cat.id);
            return (
              <CheckRow
                key={cat.id}
                label={cat.name}
                checked={checked}
                count={count}
                disabled={count === 0 && !checked}
                onChange={(on) => toggleCategory(cat.id, on)}
              />
            );
          })}
        </div>
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-[13px] font-semibold text-blue-accent hover:underline"
          >
            {expanded ? "Show less" : `Show ${hiddenCount} more`}
          </button>
        )}
      </div>

      <Section label="Location">
        <label className="flex h-10 items-center gap-2 rounded-xl bg-bone px-3 text-sm text-ink/50">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="City or state"
            aria-label="City or state"
            className="w-full bg-transparent text-ink outline-none placeholder:text-ink/45"
          />
        </label>
        {topCities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {topCities.map((city) => {
              const active =
                filters.location?.toLowerCase() === city.toLowerCase();
              return (
                <button
                  key={city}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onChange({ location: active ? undefined : city })
                  }
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors",
                    active
                      ? "border-ink bg-ink text-ink-foreground"
                      : "border-hairline bg-surface text-ink hover:border-ink/30",
                  )}
                >
                  {city}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section label="Status">
        {statusRows.map((row) => (
          <CheckRow
            key={row.key}
            label={row.label}
            checked={!!filters[row.key]}
            onChange={(on) => onChange({ [row.key]: on || undefined })}
          />
        ))}
      </Section>

      <Section label="Amount still needed">
        <Slider
          min={0}
          max={amountCeiling}
          step={Math.max(Math.round(amountCeiling / AMOUNT_STEPS), 1)}
          value={pendingAmountRange}
          rangeClassName="bg-ink"
          thumbClassName="border-ink bg-surface"
          onValueChange={([min, max]) => setPendingAmountRange([min, max])}
        />
        <div className="mt-3 flex items-center justify-between text-xs text-ink/55">
          <span>{formatNairaShort(pendingAmountRange[0])}</span>
          <span>
            {formatNairaShort(pendingAmountRange[1])}
            {pendingAmountRange[1] >= amountCeiling ? "+" : ""}
          </span>
        </div>
      </Section>
    </div>
  );
}
