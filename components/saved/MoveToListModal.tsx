"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createList, moveBookmarksToList } from "@/actions/saved-actions";
import { toast } from "@/hooks/use-toast";
import type { SavedListSummary } from "@/lib/saved";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarkIds: string[];
  lists: SavedListSummary[];
  /** Called after a successful move, so the grid can leave select mode. */
  onMoved: () => void;
}

const NO_LIST = "none";

export function MoveToListModal({
  open,
  onOpenChange,
  bookmarkIds,
  lists,
  onMoved,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [loading, setLoading] = useState(false);

  const creating = newListName.trim().length > 0;
  const ready = creating || selected !== null;

  const buttonLabel = loading
    ? "Moving..."
    : creating
      ? `Move to ${newListName.trim()}`
      : selected === NO_LIST
        ? "Take out of lists"
        : selected
          ? `Move to ${lists.find((l) => l.id === selected)?.name ?? "list"}`
          : "Choose a list";

  const handleMove = async () => {
    if (!ready || loading) return;
    setLoading(true);
    try {
      let target: string | null = selected === NO_LIST ? null : selected;

      if (creating) {
        const created = await createList(newListName.trim());
        if (!created.ok) {
          toast({ title: created.error, variant: "destructive" });
          return;
        }
        target = created.list.id;
      }

      const res = await moveBookmarksToList(bookmarkIds, target);
      if (!res.ok) {
        toast({ title: res.error, variant: "destructive" });
        return;
      }

      toast({
        title:
          bookmarkIds.length === 1
            ? "Moved 1 campaign"
            : `Moved ${bookmarkIds.length} campaigns`,
      });
      setSelected(null);
      setNewListName("");
      onOpenChange(false);
      onMoved();
    } catch {
      toast({ title: "Failed to move campaigns", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const rowClass = (active: boolean) =>
    cn(
      "flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-all",
      active
        ? "border-ink bg-cream-muted ring-1 ring-ink"
        : "border-hairline hover:bg-cream-muted/60",
    );

  const radioClass = "h-5 w-5 border-2 border-ink data-[state=checked]:bg-ink";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-fraunces text-2xl">
            Move {bookmarkIds.length} to a list
          </DialogTitle>
        </DialogHeader>

        <RadioGroup
          value={creating ? "" : (selected ?? "")}
          onValueChange={(v) => {
            setSelected(v);
            setNewListName("");
          }}
          className="my-4 max-h-[50vh] space-y-3 overflow-y-auto"
        >
          {lists.map((list) => (
            <Label
              key={list.id}
              className={rowClass(!creating && selected === list.id)}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={list.id} className={radioClass} />
                <div>
                  <p className="font-medium text-ink">{list.name}</p>
                  <p className="text-xs text-ink/60">
                    {list.count} {list.count === 1 ? "campaign" : "campaigns"}
                  </p>
                </div>
              </div>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: list.color }}
              />
            </Label>
          ))}

          <Label className={rowClass(!creating && selected === NO_LIST)}>
            <div className="flex items-center gap-3">
              <RadioGroupItem value={NO_LIST} className={radioClass} />
              <p className="font-medium text-ink">No list</p>
            </div>
          </Label>

          <div className="relative">
            <Input
              placeholder="New list..."
              value={newListName}
              maxLength={40}
              onChange={(e) => {
                setNewListName(e.target.value);
                if (e.target.value.trim()) setSelected(null);
              }}
              className="border-dashed pl-10"
            />
            <Plus className="absolute left-3 top-3 h-4 w-4 text-ink/40" />
          </div>
        </RadioGroup>

        <Button
          onClick={handleMove}
          disabled={loading || !ready}
          className="h-11 w-full rounded-xl bg-ink text-ink-foreground hover:bg-ink/90"
        >
          {buttonLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
