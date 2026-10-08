import type { Metadata } from "next";
import { DiscoverPageClient } from "@/components/discover/discover-page-client";
import { listBookmarkedIds } from "@/actions/bookmark-actions";
import {
  countDiscoverResults,
  getDiscoverFacets,
  getDiscoverRailData,
  listDiscoverResults,
} from "@/actions/discover-actions";
import { campaignCategoryStyles } from "@/lib/campaign-categories";
import {
  parseDiscoverSearchParams,
  type DiscoverSearchParams,
} from "@/lib/discover-url";

export const metadata: Metadata = {
  title: "Discover",
  description:
    "Browse and discover fundraising campaigns and petitions that make a real difference in the world.",
};

const PAGE_SIZE = 12;
const CATEGORY_IDS = campaignCategoryStyles.map((c) => c.id);

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<DiscoverSearchParams>;
}) {
  const params = await searchParams;
  const { tab: initialTab, filters: initialFilters } =
    parseDiscoverSearchParams(params);

  const [{ items, hasMore }, facets, bookmarks, total, railData] =
    await Promise.all([
      listDiscoverResults(initialFilters, { limit: PAGE_SIZE, offset: 0 }),
      getDiscoverFacets(initialFilters, CATEGORY_IDS),
      listBookmarkedIds().catch(() => []),
      countDiscoverResults(initialFilters),
      getDiscoverRailData(),
    ]);

  return (
    <DiscoverPageClient
      initialTab={initialTab}
      initialFilters={initialFilters}
      initialItems={items}
      initialHasMore={hasMore}
      initialFacets={facets}
      initialTotal={total}
      topCities={railData.topCities}
      amountCeiling={railData.amountCeiling}
      initialBookmarks={bookmarks.map((b) => `${b.targetType}:${b.targetId}`)}
    />
  );
}
