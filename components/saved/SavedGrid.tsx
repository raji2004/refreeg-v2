"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ToastAction } from "@/components/ui/toast";
import { GiveModal } from "@/components/discover/give-modal";
import { SignModal } from "@/components/discover/sign-modal";
import { removeBookmarks } from "@/actions/saved-actions";
import { toast } from "@/hooks/use-toast";
import { isEligible, type SavedItem, type SavedListSummary } from "@/lib/saved";
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

type PendingRemoval = { timer: ReturnType<typeof setTimeout>; ids: string[] };

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

  // Removal is committed after the undo window, so Undo is real: until the
  // timer fires nothing has been deleted on the server.
  const scheduleRemoval = (ids: string[]) => {
    if (ids.length === 0) return;
    const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setHiddenIds((prev) => new Set([...prev, ...ids]));

    const timer = setTimeout(async () => {
      pending.current.delete(key);
      try {
        await removeBookmarks(ids);
      } catch {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        toast({ title: "Failed to remove", variant: "destructive" });
      }
    }, UNDO_MS);
    pending.current.set(key, { timer, ids });

    const undo = () => {
      const entry = pending.current.get(key);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.current.delete(key);
      setHiddenIds((prev) => {
        const next = new Set(prev);
        entry.ids.forEach((id) => next.delete(id));
        return next;
      });
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

  // Leaving the page mid-window commits what is still pending.
  useEffect(() => {
    const map = pending.current;
    return () => {
      map.forEach(({ timer, ids }) => {
        clearTimeout(timer);
        void removeBookmarks(ids);
      });
      map.clear();
    };
  }, []);

  const handleBulkRemove = () => {
    scheduleRemoval(Array.from(selectedIds));
    exitSelect();
  };

  return (
    <>
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
