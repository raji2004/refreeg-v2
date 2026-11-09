"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createList, deleteList, renameList } from "@/actions/saved-actions";
import { toast } from "@/hooks/use-toast";
import type { SavedListSummary } from "@/lib/saved";

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
  const [renameName, setRenameName] = useState("");
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

  const openRename = (list: SavedListSummary) => {
    setRenameName(list.name);
    setRenameTarget(list);
  };

  const submitRename = async () => {
    const clean = renameName.trim();
    if (!renameTarget || !clean || busy) return;
    setBusy(true);
    try {
      const res = await renameList(renameTarget.id, clean);
      if (!res.ok) {
        toast({ title: res.error, variant: "destructive" });
        return;
      }
      setRenameTarget(null);
      toast({ title: "List renamed" });
      onListRenamed();
    } catch {
      toast({ title: "Failed to rename list", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget || busy) return;
    setBusy(true);
    try {
      const res = await deleteList(deleteTarget.id);
      if (!res.ok) {
        toast({ title: res.error, variant: "destructive" });
        return;
      }
      const deleted = deleteTarget;
      setDeleteTarget(null);
      toast({
        title: `List "${deleted.name}" deleted`,
        description: "Its campaigns are still saved under All.",
      });
      onListDeleted(deleted.id);
    } catch {
      toast({ title: "Failed to delete list", variant: "destructive" });
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
                  <DropdownMenuItem onSelect={() => openRename(list)}>
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

      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-fraunces text-xl">
              Rename list
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameName}
            disabled={busy}
            maxLength={40}
            placeholder="List name"
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="surface"
              disabled={busy}
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="ink"
              disabled={busy || !renameName.trim()}
              onClick={submitRename}
            >
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteTarget?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.count === 1
                ? "The campaign will remain saved under All."
                : "The campaigns will remain saved under All."}{" "}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void submitDelete();
              }}
              className="bg-rust text-rust-foreground hover:bg-rust/90"
            >
              {busy ? "Deleting…" : "Delete list"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
