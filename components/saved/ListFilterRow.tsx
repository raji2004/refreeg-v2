"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createList } from "@/actions/saved-actions";
import { toast } from "@/hooks/use-toast";
import type { SavedListSummary } from "@/lib/saved";
import { DeleteListDialog } from "./delete-list-dialog";
import { RenameListDialog } from "./rename-list-dialog";

interface Props {
  lists: SavedListSummary[];
  totalCount: number;
  activeListId: string | null;
  onChange: (listId: string | null) => void;
  onListRenamed: () => void;
  onListDeleted: (listId: string) => void;
}

const CHIP =
  "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors";

export function ListFilterRow({
  lists,
  totalCount,
  activeListId,
  onChange,
  onListRenamed,
  onListDeleted,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SavedListSummary | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<SavedListSummary | null>(
    null,
  );

  const submitNew = async () => {
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

      {lists.map((list) => {
        const active = activeListId === list.id;
        return (
          <div key={list.id} className="relative shrink-0">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onChange(list.id)}
              className={cn(chip(active), active && "pr-9")}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: list.color }}
              />
              {list.name}
              <span className="text-xs opacity-60">{list.count}</span>
            </button>

            {/* Manage actions live on the active chip only — you are almost
                always managing the list you are looking at, and it keeps the
                row calm. The button carries an explicit light color + visible
                circle: it used to inherit the page's dark ink color and sit
                invisible on the dark chip. The menu portals out, so the
                scroll container never clips it. */}
            {active && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Manage ${list.name}`}
                    title="Rename or delete this list"
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-ink-foreground transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-foreground/60"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => setRenameTarget(list)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setDeleteTarget(list)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}

      {adding ? (
        <Input
          autoFocus
          value={name}
          disabled={busy}
          maxLength={40}
          placeholder="List name, then Enter"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitNew();
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

      <RenameListDialog
        list={renameTarget}
        onClose={() => setRenameTarget(null)}
        onRenamed={onListRenamed}
      />
      <DeleteListDialog
        list={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={onListDeleted}
      />
    </div>
  );
}
