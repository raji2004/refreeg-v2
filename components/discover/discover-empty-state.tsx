"use client";

import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  explainNoResults,
  type DiscoverFilters,
} from "@/actions/discover-actions";
import { createSavedSearchAlert } from "@/actions/saved-search-actions";
import { getCampaignCategoryStyle } from "@/lib/campaign-categories";
import {
  countWord,
  filterChips,
  noneClause,
  withoutChip,
  type FilterChip,
} from "@/lib/discover-summary";

type Explanation = Awaited<ReturnType<typeof explainNoResults>>;

const plural = (n: number, word: string) =>
  `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

/** "Dropping the location", "Dropping Urgent only", … */
function droppingPhrase(chip: FilterChip, filters: DiscoverFilters) {
  if (chip.key === "location") return "Dropping the location";
  if (chip.key === "amount") return "Dropping the amount limit";
  if (chip.key === "categories")
    return (filters.categories?.length ?? 0) > 1
      ? "Dropping the causes"
      : "Dropping the cause";
  return `Dropping ${chip.label}`;
}

/** "Remove Kano", "Remove Water", "Remove Urgent only" */
function removeLabel(chip: FilterChip, filters: DiscoverFilters) {
  if (chip.key === "categories") {
    const ids = filters.categories ?? [];
    return ids.length === 1
      ? `Remove ${getCampaignCategoryStyle(ids[0]).name}`
      : "Remove causes";
  }
  return `Remove ${chip.label}`;
}

export function DiscoverEmptyState({
  filters,
  onFiltersChange,
  onClearAll,
}: {
  filters: DiscoverFilters;
  onFiltersChange: (next: DiscoverFilters) => void;
  onClearAll: () => void;
}) {
  const { toast } = useToast();
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);

  const chips = filterChips(filters);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setExplanation(null);
    setAlertSaved(false);
    if (chips.length === 0) return;
    let cancelled = false;
    explainNoResults(filters)
      .then((result) => !cancelled && setExplanation(result))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const handleSaveAlert = async () => {
    setSavingAlert(true);
    const { error } = await createSavedSearchAlert({
      label: `Alert: ${chips.map((c) => c.label).join(", ") || "All campaigns"}`,
      query: filters as Record<string, unknown>,
    });
    setSavingAlert(false);
    if (error) {
      toast({
        title: "Could not set the alert",
        description: error,
        variant: "destructive",
      });
      return;
    }
    setAlertSaved(true);
  };

  // No filters: only a search (or nothing at all) came back empty.
  if (chips.length === 0) {
    return (
      <EmptyState
        variant="page"
        className="py-16"
        icon={<Search className="h-5 w-5" strokeWidth={1.75} />}
        title={
          filters.search
            ? `Nothing matches “${filters.search}”`
            : "No campaigns here yet"
        }
        description="Try a different search, or browse every open campaign."
      />
    );
  }

  const title =
    chips.length === 1
      ? "Nothing matches this filter"
      : `Nothing matches all ${countWord(chips.length)} filters`;

  const causeNames = (filters.categories ?? []).map((id) =>
    getCampaignCategoryStyle(id).name.toLowerCase(),
  );
  const clause = noneClause(filters);
  const firstSentence =
    explanation?.causeOnlyCount && causeNames.length && clause
      ? `There are ${plural(explanation.causeOnlyCount, `${causeNames.join(" or ")} campaign`)}, but none ${clause}. `
      : "";
  const suggestion = explanation?.suggestion ?? null;
  const description = suggestion
    ? `${firstSentence}${droppingPhrase(suggestion, filters)} gives you ${plural(suggestion.count, "result")}.`
    : `${firstSentence}Try widening your filters, or clear them to see everything.`;

  return (
    <div className="py-16">
      <EmptyState
        variant="page"
        icon={<Search className="h-5 w-5" strokeWidth={1.75} />}
        title={title}
        description={explanation ? description : " "}
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            {suggestion && (
              <Button
                variant="ink"
                className="h-12 rounded-2xl px-[22px] text-[15px] font-semibold shadow-[0_8px_20px_-8px_hsl(var(--ink)/0.55)]"
                onClick={() =>
                  onFiltersChange(withoutChip(filters, { key: suggestion.key }))
                }
              >
                {removeLabel(suggestion, filters)}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClearAll}
              className="h-12 rounded-2xl border-hairline bg-surface px-[22px] text-[15px] font-semibold text-ink hover:bg-bone"
            >
              Clear all filters
            </Button>
          </div>
        }
      />

      <div className="mx-auto mt-7 flex w-fit items-center gap-3 rounded-xl bg-blue-accent/10 px-4 py-3 text-sm">
        <Bell className="h-4 w-4 shrink-0 text-blue-accent" />
        <span className="text-ink/75">
          {alertSaved
            ? "Alert set. We'll tell you when a campaign matches this."
            : "Alert me when a campaign matches this"}
        </span>
        {!alertSaved && (
          <button
            type="button"
            onClick={handleSaveAlert}
            disabled={savingAlert}
            className="font-semibold text-blue-accent hover:underline disabled:opacity-60"
          >
            {savingAlert ? "Setting…" : "Set an alert"}
          </button>
        )}
      </div>
    </div>
  );
}
