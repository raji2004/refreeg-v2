import { DiscoverCardSkeleton } from "@/components/discover/discover-card";

/**
 * Streamed while /petitions renders. Mirrors the heading + category pills +
 * three-column petition grid so the layout doesn't jump on arrival.
 */
export default function PetitionsLoading() {
  return (
    <div
      className="w-full bg-cream"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="space-y-3 pt-2">
          <div className="h-3.5 w-24 animate-pulse rounded-full bg-cream-muted" />
          <div className="h-8 w-80 max-w-full animate-pulse rounded-lg bg-cream-muted" />
          <div className="h-4 w-[28rem] max-w-full animate-pulse rounded-full bg-cream-muted" />
        </div>

        {/* Category pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-full bg-white"
              style={{ width: 96 + (i % 3) * 28 }}
            />
          ))}
        </div>

        {/* Petition grid */}
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <DiscoverCardSkeleton
              key={i}
              tone={i % 3 === 1 ? "sand" : "surface"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
