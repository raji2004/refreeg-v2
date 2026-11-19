"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getLeaderboard,
  getReferrerDonorDetail,
  type LeaderboardResult,
} from "@/actions/users/leaderboard-actions";
import { leaderboardPageSize } from "@/lib/options/referral.options";

const LEADERBOARD_REFRESH_MS = 30_000;

// Rankings move as donations verify, so refresh while the leaderboard is open.
export function useLeaderboard(initial: LeaderboardResult, live: boolean) {
  const query = useInfiniteQuery({
    queryKey: ["referral-leaderboard"],
    queryFn: ({ pageParam }) =>
      getLeaderboard({ page: pageParam, pageSize: leaderboardPageSize }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.length * leaderboardPageSize < last.totalCount
        ? pages.length + 1
        : undefined,
    initialData: { pages: [initial], pageParams: [1] },
    staleTime: LEADERBOARD_REFRESH_MS,
    refetchInterval: live ? LEADERBOARD_REFRESH_MS : false,
  });

  const pages = query.data.pages;
  const seen = new Set<string>();
  const entries = pages
    .flatMap((page) => page.entries)
    .filter((entry) => !seen.has(entry.id) && seen.add(entry.id));

  return {
    entries,
    totalCount: pages.at(-1)?.totalCount ?? initial.totalCount,
    hasMore: query.hasNextPage,
    loadMore: () => query.fetchNextPage(),
    loadingMore: query.isFetchingNextPage,
    error: query.error?.message ?? null,
  };
}

export function useReferrerDonors(referrerId: string | null) {
  const query = useQuery({
    queryKey: ["referrer-donors", referrerId],
    queryFn: () =>
      getReferrerDonorDetail(referrerId as string, { page: 1, pageSize: 50 }),
    enabled: !!referrerId,
  });

  return {
    detail: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };
}
