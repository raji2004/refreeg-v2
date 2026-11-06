"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { DiscoverCard, DiscoverCardSkeleton } from "./discover-card";
import { DiscoverEmptyState } from "./discover-empty-state";
import { GiveModal } from "./give-modal";
import { PledgeModal } from "./pledge-modal";
import { SignModal } from "./sign-modal";
import {
  listDiscoverResults,
  type DiscoverFilters,
  type DiscoverItem,
} from "@/actions/discover-actions";
import { toggleBookmark } from "@/actions/bookmark-actions";
import { DISCOVER_RESULT_CAP } from "@/lib/discover-constants";

const PAGE_SIZE = 12;

export function DiscoverGrid({
  filters,
  view,
  initialItems,
  initialHasMore,
  initialBookmarks,
  onFiltersChange,
  onClearFilters,
  onLoaded,
  onEmptyChange,
}: {
  filters: DiscoverFilters;
  view: "grid" | "list";
  initialItems: DiscoverItem[];
  initialHasMore: boolean;
  initialBookmarks: string[];
  onFiltersChange: (next: DiscoverFilters) => void;
  onClearFilters: () => void;
  onLoaded: () => void;
  onEmptyChange: (empty: boolean) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFresh, setLoadingFresh] = useState(false);
  const [bookmarked, setBookmarked] = useState<Set<string>>(
    () => new Set(initialBookmarks),
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);

  const [giveModal, setGiveModal] = useState<{ id: string } | null>(null);
  const [pledgeModal, setPledgeModal] = useState<{
    id: string;
    title: string;
    daysLeft: number | null;
  } | null>(null);
  const [signModal, setSignModal] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const isEmpty = !loadingFresh && items.length === 0;
  useEffect(() => {
    onEmptyChange(isEmpty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmpty]);

  // Refetch from scratch whenever the active filter set changes.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    let cancelled = false;
    setLoadingFresh(true);
    listDiscoverResults(filters, { limit: PAGE_SIZE, offset: 0 })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setHasMore(result.hasMore);
        setLoadingFresh(false);
        onLoaded();
      })
      .catch(() => {
        if (cancelled) return;
        setLoadingFresh(false);
        toast({
          title: "Couldn't load results",
          description: "Check your connection and try again.",
          variant: "destructive",
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await listDiscoverResults(filters, {
        limit: PAGE_SIZE,
        offset: items.length,
      });
      setItems((prev) => [...prev, ...result.items]);
      setHasMore(result.hasMore);
    } catch {
      toast({
        title: "Couldn't load more results",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, items.length, hasMore, loadingMore]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleToggleBookmark = async (item: DiscoverItem) => {
    if (!user) {
      toast({ title: "Sign in to save campaigns and petitions." });
      return;
    }
    const key = `${item.type === "campaign" ? "cause" : "petition"}:${item.id}`;
    const wasBookmarked = bookmarked.has(key);
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (wasBookmarked) next.delete(key);
      else next.add(key);
      return next;
    });
    try {
      const { error } = await toggleBookmark({
        targetType: item.type === "campaign" ? "cause" : "petition",
        targetId: item.id,
      });
      if (error) throw new Error(error);
    } catch (err) {
      setBookmarked((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.add(key);
        else next.delete(key);
        return next;
      });
      toast({
        title:
          err instanceof Error ? err.message : "Couldn't save that. Try again.",
        variant: "destructive",
      });
    }
  };

  const gridClass = useMemo(
    () =>
      view === "grid"
        ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
        : "flex flex-col gap-3",
    [view],
  );

  const skeleton = (key: number) =>
    view === "grid" ? (
      <DiscoverCardSkeleton key={key} />
    ) : (
      <div key={key} className="h-[106px] rounded-2xl bg-surface" aria-hidden />
    );

  return (
    <div>
      {loadingFresh ? (
        <div className={gridClass} aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => skeleton(i))}
        </div>
      ) : items.length === 0 ? (
        <DiscoverEmptyState
          filters={filters}
          onFiltersChange={onFiltersChange}
          onClearAll={onClearFilters}
        />
      ) : (
        <>
          <div className={gridClass}>
            {items.map((item) => {
              const key = `${item.type === "campaign" ? "cause" : "petition"}:${item.id}`;
              return (
                <DiscoverCard
                  key={key}
                  item={item}
                  view={view}
                  bookmarked={bookmarked.has(key)}
                  onToggleBookmark={() => handleToggleBookmark(item)}
                  onGiveClick={() => setGiveModal({ id: item.id })}
                  onPledgeClick={() =>
                    setPledgeModal({
                      id: item.id,
                      title: item.title,
                      daysLeft: item.daysLeft,
                    })
                  }
                  onSignClick={() =>
                    setSignModal({ id: item.id, title: item.title })
                  }
                />
              );
            })}
          </div>

          {hasMore && items.length < DISCOVER_RESULT_CAP && (
            <div ref={sentinelRef} className="mt-6 flex justify-center">
              {loadingMore ? (
                <div className={`w-full ${gridClass}`}>
                  {Array.from({ length: 3 }).map((_, i) => skeleton(i))}
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={loadMore}
                  className="rounded-xl border-hairline bg-surface text-ink hover:bg-bone"
                >
                  Load more
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {giveModal && (
        <GiveModal
          causeId={giveModal.id}
          open={!!giveModal}
          onOpenChange={(open) => !open && setGiveModal(null)}
        />
      )}
      {pledgeModal && (
        <PledgeModal
          causeId={pledgeModal.id}
          causeTitle={pledgeModal.title}
          daysActive={pledgeModal.daysLeft}
          defaultName={user?.name || ""}
          defaultEmail={user?.email || ""}
          open={!!pledgeModal}
          onOpenChange={(open) => !open && setPledgeModal(null)}
        />
      )}
      {signModal && (
        <SignModal
          petitionId={signModal.id}
          petitionTitle={signModal.title}
          defaultName={user?.name || ""}
          defaultEmail={user?.email || ""}
          open={!!signModal}
          onOpenChange={(open) => !open && setSignModal(null)}
        />
      )}
    </div>
  );
}
