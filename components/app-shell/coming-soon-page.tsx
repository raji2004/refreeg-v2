import { EmptyState } from "@/components/ui/empty-state";
import type { LucideIcon } from "lucide-react";

/** Shared placeholder for app-shell nav destinations that don't have a real page yet. */
export function ComingSoonPage({
  title,
  description,
  icon: Icon,
  emptyStateDescription,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  emptyStateDescription: string;
}) {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-ink/60 md:text-base">{description}</p>

      <EmptyState
        className="mt-8"
        icon={<Icon className="h-8 w-8 text-ink/40" />}
        title="Coming soon"
        description={emptyStateDescription}
      />
    </div>
  );
}
