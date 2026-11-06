"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastAction } from "@/components/ui/toast";
import { GiveModal } from "@/components/discover/give-modal";
import { SignModal } from "@/components/discover/sign-modal";
import { removeBookmarks, toggleBookmark } from "@/actions/saved-actions";
import { toast } from "@/hooks/use-toast";
import { bumpSavedCount, setSavedCount } from "@/lib/saved-count";
import {
  isClosingSoon,
  isEligible,
  type SavedItem,
  type SavedListSummary,
} from "@/lib/saved";
import { AlertsModal } from "./AlertsModal";
import { ListFilterRow } from "./ListFilterRow";
import { MoveToListModal } from "./MoveToListModal";
import { SavedCard } from "./SavedCard";
import { SelectActionBar } from "./SelectActionBar";

const UNDO_MS = 4000;

interface Props {
  items: SavedItem[];
  lists: SavedListSummary[];
  alertPrefs?: {
    closing_3d: boolean;
    reached_80pct: boolean;
    delivered: boolean;
    weekly_digest: boolean;
  };
  user: { name: string; email: string };
}

/**
 * A removal in progress. Unlike the old timer-based design, the deletion is
 * committed to the server immediately — `undone`/`committed` only exist to
 * make Undo correct when it fires before or after that commit lands.
 */
type PendingRemoval = {
  ids: string[];
  snapshot: SavedItem[];
  undone: boolean;
  committed: boolean;
};

export function SavedGrid({ items, lists, alertPrefs, user }: Props) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [giveId, setGiveId] = useState<string | null>(null);
  const [signTarget, setSignTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const router = useRouter();

  const pending = useRef(new Map<string, PendingRemoval>());

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const liveItems = useMemo(
    () => items.filter((i) => !hiddenIds.has(i.id)),
    [items, hiddenIds],
  );

  const visibleItems = useMemo(
    () =>
      activeListId === null
        ? liveItems
        : liveItems.filter((i) => i.listId === activeListId),
    [liveItems, activeListId],
  );

  const totalShort = useMemo(
    () =>
      Array.from(selectedIds).reduce(
        (sum, id) => sum + (byId.get(id)?.short ?? 0),
        0,
      ),
    [selectedIds, byId],
  );

  // Header stats now read from `liveItems`, so they drop the moment a card is
  // hidden — no server round trip, no stale "2 saved" after removing one.
  const closingSoon = liveItems.filter(isClosingSoon).length;
  const closed = liveItems.filter((i) => i.status === "closed").length;

  const exitSelect = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = (id: string) => {
    const item = byId.get(id);
    if (!item || !isEligible(item)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Re-create bookmarks after an Undo, then refresh the route so the new
  // bookmark ids replace the stale ones in `items` (toggleBookmark mints a
  // new row, so the old bookmark id is gone for good).
  const recreate = useCallback(
    async (snapshot: SavedItem[]) => {
      let lastCount: number | null = null;
      for (const item of snapshot) {
        try {
          const res = await toggleBookmark(item.targetId, item.kind);
          lastCount = res.count;
        } catch {
          // best effort — leave it to the next refresh to reconcile
        }
      }
      if (lastCount !== null) setSavedCount(lastCount);
      router.refresh();
    },
    [router],
  );

  // Removal commits immediately. Undo re-creates via toggleBookmark. This
  // fixes the old bug where a refresh during the undo window brought the
  // bookmark back, because the deletion had not been sent yet.
  const scheduleRemoval = (ids: string[]) => {
    if (ids.length === 0) return;
    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const snapshot = ids
      .map((id) => byId.get(id))
      .filter((i): i is SavedItem => !!i);

    // Optimistic: hide the cards and nudge the sidebar badge right now.
    setHiddenIds((prev) => new Set([...prev, ...ids]));
    bumpSavedCount(-ids.length);

    const entry: PendingRemoval = {
      ids,
      snapshot,
      undone: false,
      committed: false,
    };
    pending.current.set(key, entry);

    // Commit the deletion immediately — no timer.
    removeBookmarks(ids)
      .then((res) => {
        entry.committed = true;
        if (res.count !== null) setSavedCount(res.count);
        // If Undo fired while the commit was in flight, re-create now.
        if (entry.undone) void recreate(snapshot);
      })
      .catch(() => {
        if (entry.undone) return; // Undo already restored visibility.
        setHiddenIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        bumpSavedCount(ids.length);
        pending.current.delete(key);
        toast({ title: "Failed to remove", variant: "destructive" });
      });

    const undo = () => {
      const e = pending.current.get(key);
      if (!e) return;
      pending.current.delete(key);

      // Un-hide optimistically and bump the badge back.
      setHiddenIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      bumpSavedCount(ids.length);

      if (e.committed) {
        // Already deleted — re-create now.
        void recreate(snapshot);
      } else {
        // Commit still in flight — flag it so the .then() re-creates.
        e.undone = true;
      }
    };

    toast({
      title:
        ids.length === 1
          ? "Removed from saved"
          : `${ids.length} removed from saved`,
      duration: UNDO_MS,
      action: (
        <ToastAction altText="Undo removal" onClick={undo}>
          Undo
        </ToastAction>
      ),
    });
  };

  const handleBulkRemove = () => {
    scheduleRemoval(Array.from(selectedIds));
    exitSelect();
  };

  return (
    <>
      <header className="mb-6">
        <h1 className="mb-2 font-fraunces text-4xl font-semibold text-ink">
          {liveItems.length} saved
        </h1>
        <p className="text-ink/60">
          {closingSoon} close within a week · {closed} already closed
        </p>
      </header>

      <div className="sticky top-0 z-30 -mx-2 mb-6 bg-cream/95 px-2 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {selectMode ? (
              <SelectActionBar
                count={selectedIds.size}
                totalShort={totalShort}
                onMove={() => setMoveOpen(true)}
                onRemove={handleBulkRemove}
              />
            ) : (
              <ListFilterRow
                lists={lists}
                totalCount={liveItems.length}
                activeListId={activeListId}
                onChange={setActiveListId}
              />
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="surface"
              size="icon"
              aria-label="Alert settings"
              onClick={() => setAlertsOpen(true)}
              className="h-9 w-9 rounded-full"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant={selectMode ? "ink" : "surface"}
              size="sm"
              disabled={!selectMode && visibleItems.length === 0}
              onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
              className="rounded-full"
            >
              {selectMode ? "Done selecting" : "Select"}
            </Button>
          </div>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState
          title={
            activeListId
              ? "Nothing in this list yet"
              : "Nothing saved right now"
          }
          description={
            activeListId
              ? "Select campaigns and move them here."
              : "Bookmark campaigns in Discover and they will show up here."
          }
        />
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {visibleItems.map((item) => (
              <SavedCard
                key={item.id}
                item={item}
                selectMode={selectMode}
                isSelected={selectedIds.has(item.id)}
                onToggle={toggleSelect}
                onUnsave={(id) => scheduleRemoval([id])}
                onGive={(i) => setGiveId(i.targetId)}
                onSign={(i) =>
                  setSignTarget({ id: i.targetId, title: i.title })
                }
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <MoveToListModal
        open={moveOpen}
        onOpenChange={setMoveOpen}
        bookmarkIds={Array.from(selectedIds)}
        lists={lists}
        onMoved={exitSelect}
      />

      <AlertsModal
        open={alertsOpen}
        onOpenChange={setAlertsOpen}
        initialPrefs={alertPrefs}
      />

      {giveId && (
        <GiveModal
          causeId={giveId}
          open
          onOpenChange={(open) => !open && setGiveId(null)}
        />
      )}
      {signTarget && (
        <SignModal
          petitionId={signTarget.id}
          petitionTitle={signTarget.title}
          defaultName={user.name}
          defaultEmail={user.email}
          open
          onOpenChange={(open) => !open && setSignTarget(null)}
        />
      )}
    </>
  );
}
