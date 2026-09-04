import * as React from "react"

import { cn } from "@/lib/utils"

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

/**
 * Explains what the page will become rather than apologizing for being
 * empty. One link action, no illustration-as-decoration. See
 * docs/DESIGN_GUIDE.md.
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-ink/20 p-10 text-center",
        className,
      )}
      {...props}
    >
      {icon}
      <p className="font-fraunces text-lg">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  ),
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
