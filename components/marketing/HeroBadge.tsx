import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Lime dot pill above a marketing hero headline, as on the home page. */
export function HeroBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant="cleared"
      className={cn(
        "w-fit gap-2 px-4 py-2 text-xs text-ink shadow-md sm:text-sm",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-blue-accent" />
      {children}
    </Badge>
  );
}
