import { Suspense } from "react";
import { CausesList } from "@/components/causes-list";
import { CausesFilter } from "@/components/causes-filter";
import { Skeleton } from "@/components/ui/skeleton";
import CausesFilterRow from "@/components/causes-filter-row";
import { H1, H5 } from "@/components/typography";
import { Metadata } from "next";
import { getProfile } from "@/actions/profile-actions";

export const metadata: Metadata = {
  title: "Explore Causes",
  description:
    "Browse and discover fundraising causes that make a real difference in the world.",
};

export default async function CausesPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    page?: string;
    filter?: string;
    userId?: string;
    action?: string;
    search?: string;
    sortBy?: string;
  }>;
}) {
  const params = await searchParams;

  const category = params.category || "all";
  const page = Number.parseInt(params.page || "1");
  const pageSize = 8;
  const userId = params.userId || null;
  const action = params.action || null;
  const search = params.search || "";

  // ↓↓↓ DEFAULT CHANGED HERE: fallback to "most-funded"
  const sortBy =
    (params.sortBy as
      | "recommended"
      | "latest"
      | "most-funded"
      | "ending-soon") || "most-funded";

  let profile = null;
  if (userId) {
    profile = await getProfile(userId);
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <H1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
          {userId && profile?.full_name
            ? `${profile.full_name}'s Causes`
            : "Explore Causes"}
        </H1>
        <H5 className="text-muted-foreground md:max-w-2xl mx-auto mt-4">
          {userId
            ? `Browse and support causes created by ${profile?.full_name || "this user"}.`
            : "From disaster relief to creative dreams, explore causes powered by real people, verified for transparency, and built for impact."}
        </H5>
      </div>

      {/* Filters (optional: hide on user-specific view) */}
      {!userId && (
        <>
          <div>
            {/* This component handles both the top bar AND the mobile FilterSideNav internally */}
            <CausesFilterRow className="mt-4" />
          </div>
          <div>
            <CausesFilter selectedCategory={category} />
          </div>
        </>
      )}

      {/* Causes List */}
      <div>
        <Suspense
          key={`${category}-${page}-${search}-${sortBy}`}
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: pageSize }).map((_, i) => (
                <Skeleton key={i} className="h-[400px] w-full rounded-xl" />
              ))}
            </div>
          }
        >
          <CausesList
            category={category}
            page={page}
            pageSize={pageSize}
            userId={userId}
            action={action}
            search={search}
            sortBy={sortBy}
          />
        </Suspense>
      </div>
    </div>
  );
}
