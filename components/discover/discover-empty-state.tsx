"use client";

import { useEffect, useState } from "react";
import { Search, BellPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  suggestFilterToRemove,
  type DiscoverFilters,
} from "@/actions/discover-actions";
import { createSavedSearchAlert } from "@/actions/saved-search-actions";

const FILTER_LABELS: Partial<Record<keyof DiscoverFilters, string>> = {
  category: "category",
  location: "location",
  urgentOnly: "urgent only",
  verifiedOnly: "verified NGOs only",
  nearGoalOnly: "near its goal",
  minAmountNeeded: "minimum amount",
  maxAmountNeeded: "maximum amount",
  search: "search",
};

function activeFilterKeys(filters: DiscoverFilters): (keyof DiscoverFilters)[] {
  const keys: (keyof DiscoverFilters)[] = [];
  if (filters.category) keys.push("category");
  if (filters.location) keys.push("location");
  if (filters.urgentOnly) keys.push("urgentOnly");
  if (filters.verifiedOnly) keys.push("verifiedOnly");
  if (filters.nearGoalOnly) keys.push("nearGoalOnly");
  if (filters.minAmountNeeded != null) keys.push("minAmountNeeded");
  if (filters.maxAmountNeeded != null) keys.push("maxAmountNeeded");
  return keys;
}

export function DiscoverEmptyState({
  filters,
  onRemoveFilter,
  onClearAll,
}: {
  filters: DiscoverFilters;
  onRemoveFilter: (key: keyof DiscoverFilters) => void;
  onClearAll: () => void;
}) {
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState<{
    key: keyof DiscoverFilters;
    count: number;
  } | null>(null);
  const [savingAlert, setSavingAlert] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);

  useEffect(() => {
    const keys = activeFilterKeys(filters);
    if (keys.length === 0) {
      setSuggestion(null);
      return;
    }
    let cancelled = false;
    suggestFilterToRemove(filters, keys).then((result) => {
      if (!cancelled && result) {
        setSuggestion({ key: result.key, count: result.count });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const handleSaveAlert = async () => {
    setSavingAlert(true);
    const label = activeFilterKeys(filters)
      .map((k) => FILTER_LABELS[k])
      .filter(Boolean)
      .join(", ") || "All campaigns";
    const { error } = await createSavedSearchAlert({
      label: `Alert: ${label}`,
      query: filters as Record<string, unknown>,
    });
    setSavingAlert(false);
    if (error) {
      toast({ title: "Could not save alert", description: error, variant: "destructive" });
      return;
    }
    setAlertSaved(true);
    toast({ title: "Alert saved", description: "We'll keep this filter set on your saved searches." });
  };

  return (
    <div className="space-y-4">
      <EmptyState
        icon={<Search className="h-8 w-8 text-ink/40" />}
        title="No results match these filters"
        description={
          suggestion && suggestion.count > 0
            ? `Removing "${FILTER_LABELS[suggestion.key]}" gives you ${suggestion.count} result${
                suggestion.count === 1 ? "" : "s"
              }.`
            : "Try widening your filters, or clear them to see everything."
        }
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            {suggestion && suggestion.count > 0 && (
              <Button variant="ink" size="sm" onClick={() => onRemoveFilter(suggestion.key)}>
                Remove {FILTER_LABELS[suggestion.key]}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClearAll}>
              Clear all filters
            </Button>
          </div>
        }
      />

      {activeFilterKeys(filters).length > 0 && (
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-ink/15 bg-ink/[0.03] p-4 text-sm">
          <div className="flex items-center gap-2 text-ink/80">
            <BellPlus className="h-4 w-4 shrink-0" />
            <span>Get notified when new campaigns match this filter set.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={savingAlert || alertSaved}
            onClick={handleSaveAlert}
            className="shrink-0"
          >
            {alertSaved ? "Saved" : savingAlert ? "Saving…" : "Set an alert"}
          </Button>
        </div>
      )}
    </div>
  );
}
