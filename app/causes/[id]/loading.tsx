/**
 * Streamed while a campaign page renders. Mirrors the campaign layout
 * (media panel + story column) so the shell doesn't jump when content
 * arrives.
 */
export default function CauseDetailLoading() {
  return (
    <div
      className="w-full bg-cream"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 h-3.5 w-40 animate-pulse rounded-full bg-cream-muted" />

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Media / story column */}
          <div className="space-y-6">
            <div className="aspect-[2/1] w-full animate-pulse rounded-2xl bg-cream-muted" />
            <div className="space-y-3 rounded-2xl bg-white p-6">
              <div className="h-5 w-40 animate-pulse rounded-full bg-cream-muted" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded-full bg-cream-muted"
                  style={{ width: `${96 - (i % 3) * 12}%` }}
                />
              ))}
            </div>
          </div>

          {/* Summary / give column */}
          <div className="space-y-6">
            <div className="space-y-4 rounded-2xl bg-white p-6">
              <div className="h-7 w-11/12 animate-pulse rounded-lg bg-cream-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-cream-muted" />
              {/* progress bar */}
              <div className="h-2.5 w-full animate-pulse rounded-full bg-cream-muted" />
              <div className="flex justify-between">
                <div className="h-4 w-24 animate-pulse rounded-full bg-cream-muted" />
                <div className="h-4 w-16 animate-pulse rounded-full bg-cream-muted" />
              </div>
              <div className="h-12 w-full animate-pulse rounded-xl bg-cream-muted" />
              <div className="h-12 w-full animate-pulse rounded-xl bg-cream-muted" />
            </div>
            <div className="h-40 animate-pulse rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
