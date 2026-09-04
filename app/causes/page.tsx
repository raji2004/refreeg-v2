import type { Metadata } from "next";
import { DiscoverPageClient } from "@/components/discover/discover-page-client";
import {
  listDiscoverResults,
  getDiscoverFacets,
  type DiscoverFilters,
} from "@/actions/discover-actions";
import { campaignCategoryStyles } from "@/lib/campaign-categories";

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
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const initialFilters: DiscoverFilters = {
    search: params.search || undefined,
    sortBy: "newest",
  };

  const [{ items, hasMore }, facets] = await Promise.all([
    listDiscoverResults(initialFilters, { limit: PAGE_SIZE, offset: 0 }),
    getDiscoverFacets(initialFilters, CATEGORY_IDS),
  ]);

  return (
    <DiscoverPageClient
      initialFilters={initialFilters}
      initialItems={items}
      initialHasMore={hasMore}
      initialFacets={facets}
    />
  );
}
