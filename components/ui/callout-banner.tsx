import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * The gold/lime status banner used at the top of a page to state the one
 * fact that's true right now — a blocked withdrawal, a held bounty payout,
 * an under-review notice. See docs/DESIGN_GUIDE.md.
 *
 * A banner states what is true; it is not itself a button. Pair it with at
 * most one inline link (`action`), never a button — the primary action for
 * the page lives below it.
 */
const calloutBannerVariants = cva("flex items-start gap-3 rounded-xl border p-4 text-sm", {
  variants: {
    variant: {
      gold: "border-gold/40 bg-gold/30 text-ink",
      lime: "border-lime/40 bg-lime/20 text-ink",
      neutral: "border-ink/15 bg-ink/[0.03] text-ink",
    },
  },
  defaultVariants: {
    variant: "gold",
  },
})

export interface CalloutBannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof calloutBannerVariants> {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  icon?: React.ReactNode
}

const CalloutBanner = React.forwardRef<HTMLDivElement, CalloutBannerProps>(
  ({ className, variant, title, description, action, icon, ...props }, ref) => (
    <div ref={ref} className={cn(calloutBannerVariants({ variant }), className)} {...props}>
      {icon}
      <div className="flex-1 space-y-0.5">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-ink/70">{description}</p> : null}
      </div>
      {action}
    </div>
  ),
)
CalloutBanner.displayName = "CalloutBanner"

export { CalloutBanner, calloutBannerVariants }
