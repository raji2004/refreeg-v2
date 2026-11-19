import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ViewDonorsLink({
  onClick,
  compact = false,
}: {
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <Button
      variant="bare"
      size="bare"
      onClick={onClick}
      aria-label="View donors"
      className={cn(
        "shrink-0 gap-1.5 text-blue-accent hover:opacity-80",
        !compact && "mt-4",
      )}
    >
      {compact ? (
        <span className="hidden sm:inline">View donors</span>
      ) : (
        "View donors"
      )}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
