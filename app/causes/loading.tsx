import { DiscoverCardSkeleton } from "@/components/discover/discover-card";

/**
 * Streamed while /causes renders (covers the Discover grid). Keeps the
 * AppShell chrome mounted and mirrors the real page layout, so the click
 * feels instant instead of waiting on the full server render.
 */
export default function CausesLoading() {
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
          <div className="h-3.5 w-28 animate-pulse rounded-full bg-cream-muted" />
          <div className="h-8 w-72 max-w-full animate-pulse rounded-lg bg-cream-muted" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-cream-muted" />
        </div>

        <div className="mt-8 flex gap-8">
          {/* Filter rail */}
          <div className="sticky top-6 hidden w-60 shrink-0 pt-2 lg:block">
            <div className="space-y-3 rounded-2xl bg-white p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded-full bg-cream-muted"
                  style={{ width: `${85 - i * 8}%` }}
                />
              ))}
            </div>
          </div>

          {/* Card grid */}
          <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <DiscoverCardSkeleton
                key={i}
                tone={i % 3 === 1 ? "sand" : "surface"}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
