import Link from "next/link";
import { cn } from "@/lib/utils";
import type { GivingFilter } from "@/actions/giving-actions";

const FILTERS: { value: GivingFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "delivered", label: "Delivered" },
  { value: "in-progress", label: "In progress" },
  { value: "pledges", label: "Pledges" },
];

export function FilterPills({
  filter,
  hrefFor,
}: {
  filter: GivingFilter;
  hrefFor: (filter: GivingFilter) => string;
}) {
  return (
    <nav aria-label="Filter gifts" className="flex gap-2 overflow-x-auto">
      {FILTERS.map(({ value, label }) => (
        <Link
          key={value}
          href={hrefFor(value)}
          scroll={false}
          aria-current={value === filter ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            value === filter
              ? "border-ink bg-ink text-ink-foreground"
              : "border-hairline bg-surface text-ink hover:border-ink/30",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
