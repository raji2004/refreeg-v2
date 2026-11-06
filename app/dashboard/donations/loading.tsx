export default function MyGivingLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1440px] animate-pulse px-4 py-6 sm:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading your giving"
    >
      <div className="h-12 w-72 rounded-xl bg-cream-muted" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="h-[118px] rounded-2xl border border-ink/10 shadow-subtle bg-surface/80" />
        <div className="h-[118px] rounded-2xl border border-ink/10 shadow-subtle bg-surface/80" />
        <div className="h-[118px] rounded-2xl border border-ink/10 shadow-subtle bg-surface/80" />
        <div className="h-[118px] rounded-2xl border border-ink/10 shadow-subtle bg-sand/60" />
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-24 rounded-2xl border border-ink/10 shadow-subtle bg-surface/80" />
        <div className="h-24 rounded-2xl border border-ink/10 shadow-subtle bg-surface/80" />
        <div className="h-24 rounded-2xl border border-ink/10 shadow-subtle bg-surface/80" />
      </div>
    </div>
  );
}
