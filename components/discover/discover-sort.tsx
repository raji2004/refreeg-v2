"use client";

import { ArrowUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DiscoverSort } from "@/actions/discover-actions";

const SORT_OPTIONS: { id: DiscoverSort; label: string }[] = [
  { id: "most-urgent", label: "Most urgent" },
  { id: "closest-to-goal", label: "Closest to goal" },
  { id: "newest", label: "Newest first" },
  { id: "most-given", label: "Most given" },
  { id: "closing-soonest", label: "Closing soonest" },
];

export function DiscoverSort({
  value,
  onChange,
}: {
  value: DiscoverSort;
  onChange: (sort: DiscoverSort) => void;
}) {
  const active = SORT_OPTIONS.find((o) => o.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-ink/15 bg-cream px-3.5 py-2 text-sm font-medium text-ink hover:bg-ink/5"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {active?.label || "Sort"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onChange(option.id)}
            className="flex items-center justify-between gap-2"
          >
            {option.label}
            {option.id === value && <Check className="h-4 w-4 text-ink" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
