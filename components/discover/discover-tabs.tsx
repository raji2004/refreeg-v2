"use client";

import { cn } from "@/lib/utils";
import type { DiscoverFilters, DiscoverSort } from "@/actions/discover-actions";

export type DiscoverTab =
  | "all"
  | "for-you"
  | "urgent"
  | "closing-soon"
  | "petitions"
  | "new";

const TABS: { id: DiscoverTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "for-you", label: "For you" },
  { id: "urgent", label: "Urgent" },
  { id: "closing-soon", label: "Closing this week" },
  { id: "petitions", label: "Petitions" },
  { id: "new", label: "New" },
];

/** Maps a tab to its preset filter+sort overrides, layered on top of whatever the rail already has active. */
export function presetForTab(
  tab: DiscoverTab,
): { filters: Partial<DiscoverFilters>; sortBy: DiscoverSort } {
  switch (tab) {
    case "urgent":
      return { filters: { urgentOnly: true, includeType: "all" }, sortBy: "most-urgent" };
    case "closing-soon":
      return { filters: { urgentOnly: true, includeType: "all" }, sortBy: "closing-soonest" };
    case "petitions":
      return { filters: { urgentOnly: false, includeType: "petitions" }, sortBy: "newest" };
    case "new":
      return { filters: { urgentOnly: false, includeType: "all" }, sortBy: "newest" };
    case "for-you":
      return { filters: { urgentOnly: false, includeType: "all" }, sortBy: "closest-to-goal" };
    case "all":
    default:
      return { filters: { urgentOnly: false, includeType: "all" }, sortBy: "newest" };
  }
}

export function DiscoverTabs({
  active,
  onChange,
}: {
  active: DiscoverTab;
  onChange: (tab: DiscoverTab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            active === tab.id
              ? "border-ink bg-ink text-ink-foreground"
              : "border-ink/15 bg-cream text-ink/70 hover:bg-ink/5",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
