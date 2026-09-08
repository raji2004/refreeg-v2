import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div
      className="min-h-[640px] space-y-5 px-4 py-5 sm:px-6 sm:py-7"
      aria-label="Loading dashboard content"
      aria-busy="true"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-52 max-w-full" />
          </div>
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="space-y-3 border-b border-slate-200 p-5 last:border-b-0 sm:border-r xl:border-b-0"
          >
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3.5 w-36 max-w-full" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-64 max-w-full" />
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-4/5 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
