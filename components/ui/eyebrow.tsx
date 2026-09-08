import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Small-caps section label, e.g. "STEP 1 OF 4", "WHAT LEVEL 2 UNLOCKS".
 * See docs/DESIGN_GUIDE.md.
 */
const Eyebrow = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span ref={ref} className={cn("label-eyebrow", className)} {...props} />
  ),
)
Eyebrow.displayName = "Eyebrow"

export { Eyebrow }
