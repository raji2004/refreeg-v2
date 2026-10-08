"use client";

import { Check, ChevronDown } from "lucide-react";
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
  { id: "most-given", label: "Most given to" },
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
          className="group flex h-11 items-center gap-2 rounded-xl border border-hairline bg-surface px-4 text-sm text-ink/55 outline-none transition-colors hover:border-ink/30 focus-visible:ring-2 focus-visible:ring-blue-accent data-[state=open]:border-blue-accent"
        >
          Sort
          <span className="font-semibold text-ink">
            {active?.label || "Newest first"}
          </span>
          <ChevronDown className="h-4 w-4 text-ink/50 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl border-hairline bg-surface p-1.5"
      >
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-ink focus:bg-bone ${
              option.id === value ? "bg-bone font-semibold" : ""
            }`}
          >
            {option.label}
            {option.id === value && <Check className="h-4 w-4 text-ink" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
