import { PaginationButton } from "@/components/pagination-button";
import { listCauses, countCauses } from "@/actions/cause-actions";
import { CauseCard } from "@/components/cause-card";

interface CausesListProps {
  category: string;
  page: number;
  pageSize: number;
  userId?: string | null;
  action?: string | null;
  search?: string;
  sortBy?: "recommended" | "latest" | "most-funded" | "ending-soon";
}

export async function CausesList({
  category,
  page,
  pageSize,
  userId,
  action,
  search,
  sortBy,
}: CausesListProps) {
  // Build filter options
  const filterOptions: any = {
    category: category === "all" ? undefined : category,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: search || undefined,
    // ↓↓↓ DEFAULT CHANGED HERE
    sortBy: sortBy || "most-funded",
  };

  if (userId) {
    filterOptions.userId = userId;
  }

  // Count options must mirror filter options (without limit/offset)
  const countOptions: any = {
    category: category === "all" ? undefined : category,
    search: search || undefined,
    ...(userId ? { userId } : {}),
  };

  // Fetch causes and total count in parallel
  const [causes, totalCount] = await Promise.all([
    listCauses(filterOptions),
    countCauses(countOptions),
  ]);

  // If user-specific, filter by userId (belt-and-suspenders)
  const filteredCauses = userId
    ? causes.filter((cause) => cause.user_id === userId)
    : causes;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (filteredCauses.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-800">
          {search
            ? "No matching causes"
            : userId
              ? "No causes yet"
              : "No causes found"}
        </h3>
        <p className="text-muted-foreground mt-1 max-w-md mx-auto">
          {search
            ? `No causes match "${search}". Try a different search term.`
            : userId
              ? "This user hasn't created any causes yet."
              : "Try selecting a different category or check back later."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Results count */}
      {search && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredCauses.length} of {totalCount} results for &ldquo;
          {search}&rdquo;
        </p>
      )}

      {/* Cause Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCauses.map((cause) => (
          <CauseCard key={cause.id} cause={cause} action={action} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <PaginationButton currentPage={page} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
}
