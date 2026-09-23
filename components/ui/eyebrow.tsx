import * as React from "react";

import { cn } from "@/lib/utils";

const Eyebrow = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("label-eyebrow", className)} {...props} />
));
Eyebrow.displayName = "Eyebrow";

export { Eyebrow };
