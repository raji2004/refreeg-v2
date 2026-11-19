"use client";

import { useState } from "react";
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
import { deleteList } from "@/actions/users/saved-actions";
import { toast } from "@/hooks/use-toast";
import type { SavedListSummary } from "@/lib/saved/saved";

export function DeleteListDialog({
  list,
  onClose,
  onDeleted,
}: {
  list: SavedListSummary | null;
  onClose: () => void;
  onDeleted: (listId: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!list || busy) return;
    setBusy(true);
    try {
      const res = await deleteList(list.id);
      if (!res.ok) {
        toast({ title: res.error, variant: "destructive" });
        return;
      }
      onClose();
      toast({
        title: `List "${list.name}" deleted`,
        description: "Its campaigns are still saved under All.",
      });
      onDeleted(list.id);
    } catch {
      toast({ title: "Failed to delete list", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog
      open={list !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete &ldquo;{list?.name}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {list?.count === 1
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
              void submit();
            }}
            className="bg-rust text-rust-foreground hover:bg-rust/90"
          >
            {busy ? "Deleting…" : "Delete list"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
