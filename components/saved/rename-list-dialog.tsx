"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { renameList } from "@/actions/users/saved-actions";
import { toast } from "@/hooks/use-toast";
import type { SavedListSummary } from "@/lib/saved/saved";

export function RenameListDialog({
  list,
  onClose,
  onRenamed,
}: {
  list: SavedListSummary | null;
  onClose: () => void;
  onRenamed: () => void;
}) {
  return (
    <Dialog open={list !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {list ? (
          <RenameListForm
            key={list.id}
            list={list}
            onClose={onClose}
            onRenamed={onRenamed}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RenameListForm({
  list,
  onClose,
  onRenamed,
}: {
  list: SavedListSummary;
  onClose: () => void;
  onRenamed: () => void;
}) {
  const [form, setForm] = useState({ name: list.name });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const clean = form.name.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      const res = await renameList(list.id, clean);
      if (!res.ok) {
        toast({ title: res.error, variant: "destructive" });
        return;
      }
      onClose();
      toast({ title: "List renamed" });
      onRenamed();
    } catch {
      toast({ title: "Failed to rename list", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-fraunces text-xl">Rename list</DialogTitle>
      </DialogHeader>
      <Input
        autoFocus
        value={form.name}
        disabled={busy}
        maxLength={40}
        placeholder="List name"
        onChange={(e) => setForm({ name: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      <div className="flex justify-end gap-2">
        <Button variant="surface" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="ink"
          disabled={busy || !form.name.trim()}
          onClick={submit}
        >
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </>
  );
}
