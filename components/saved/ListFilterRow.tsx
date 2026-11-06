"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createList } from "@/actions/saved-actions";
import { toast } from "@/hooks/use-toast";
import type { SavedListSummary } from "@/lib/saved";

interface Props {
  lists: SavedListSummary[];
  totalCount: number;
  activeListId: string | null;
  onChange: (listId: string | null) => void;
}

const CHIP =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors";

export function ListFilterRow({
  lists,
  totalCount,
  activeListId,
  onChange,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const clean = name.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      const res = await createList(clean);
      if (!res.ok) {
        toast({ title: res.error, variant: "destructive" });
        return;
      }
      setName("");
      setAdding(false);
      toast({ title: `List "${res.list.name}" created` });
    } catch {
      toast({ title: "Failed to create list", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const chip = (active: boolean) =>
    cn(
      CHIP,
      active
        ? "bg-ink text-ink-foreground"
        : "border border-hairline bg-surface text-ink/70 hover:text-ink",
    );

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        aria-pressed={activeListId === null}
        onClick={() => onChange(null)}
        className={chip(activeListId === null)}
      >
        All
        <span className="text-xs opacity-60">{totalCount}</span>
      </button>

      {lists.map((list) => (
        <button
          key={list.id}
          type="button"
          aria-pressed={activeListId === list.id}
          onClick={() => onChange(list.id)}
          className={chip(activeListId === list.id)}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: list.color }}
          />
          {list.name}
          <span className="text-xs opacity-60">{list.count}</span>
        </button>
      ))}

      {adding ? (
        <Input
          autoFocus
          value={name}
          disabled={busy}
          maxLength={40}
          placeholder="List name, then Enter"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") {
              setAdding(false);
              setName("");
            }
          }}
          onBlur={() => {
            if (!name.trim() && !busy) setAdding(false);
          }}
          className="h-9 w-48 shrink-0 rounded-full border-dashed bg-transparent text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cn(
            CHIP,
            "border border-dashed border-ink/30 text-ink/60 hover:text-ink",
          )}
        >
          <Plus className="h-4 w-4" />
          New list
        </button>
      )}
    </div>
  );
}
