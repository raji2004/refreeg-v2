import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const calloutBannerVariants = cva(
  "flex items-start gap-3 rounded-xl border p-4 text-sm",
  {
    variants: {
      variant: {
        gold: "border-gold/40 bg-gold/30 text-ink",
        lime: "border-lime/40 bg-lime/20 text-ink",
        neutral: "border-ink/15 bg-ink/[0.03] text-ink",
        rust: "border-rust/30 bg-rust/10 text-ink",
        forest: "border-forest/30 bg-forest/10 text-ink",
        sand: "border-sand bg-sand/30 text-ink",
      },
    },
    defaultVariants: {
      variant: "gold",
    },
  },
);

export interface CalloutBannerProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof calloutBannerVariants> {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

const CalloutBanner = React.forwardRef<HTMLDivElement, CalloutBannerProps>(
  ({ className, variant, title, description, action, icon, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(calloutBannerVariants({ variant }), className)}
      {...props}
    >
      {icon}
      <div className="flex-1 space-y-0.5">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-ink/70">{description}</p> : null}
      </div>
      {action}
    </div>
  ),
);
CalloutBanner.displayName = "CalloutBanner";

export { CalloutBanner, calloutBannerVariants };
