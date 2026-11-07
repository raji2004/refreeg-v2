"use client";

import { MoveRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNairaShort } from "@/lib/discover-summary";

interface Props {
  count: number;
  /** Naira still needed across the selection. */
  totalShort: number;
  onMove: () => void;
  onRemove: () => void;
}

/** Takes the place of the list-filter row while selecting. */
export function SelectActionBar({
  count,
  totalShort,
  onMove,
  onRemove,
}: Props) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-ink px-4 py-2 text-ink-foreground animate-in fade-in duration-200">
      <div className="flex min-w-0 items-baseline gap-3">
        <span className="whitespace-nowrap text-sm font-semibold">
          {count === 0 ? "Select campaigns" : `${count} selected`}
        </span>
        {count > 0 && (
          <span className="truncate text-xs text-white/60">
            {formatNairaShort(totalShort)} still needed
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="surface"
          size="sm"
          disabled={count === 0}
          onClick={onMove}
          className="h-8 rounded-lg"
        >
          <MoveRight className="mr-2 h-4 w-4" /> Move to list
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={count === 0}
          onClick={onRemove}
          className="h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 hover:text-white"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Remove
        </Button>
      </div>
    </div>
  );
}
