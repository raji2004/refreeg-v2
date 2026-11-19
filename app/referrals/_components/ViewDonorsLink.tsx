import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function ViewDonorsLink({
  onClick,
  compact = false,
}: {
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="View donors"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-blue-accent hover:opacity-80",
        !compact && "mt-4",
      )}
    >
      {compact ? (
        <span className="hidden sm:inline">View donors</span>
      ) : (
        "View donors"
      )}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
