import * as React from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** `page` fills an otherwise empty screen: no border, larger type. */
  variant?: "inline" | "page";
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      title,
      description,
      action,
      variant = "inline",
      className,
      ...props
    },
    ref,
  ) =>
    variant === "page" ? (
      <div
        ref={ref}
        className={cn("flex flex-col items-center text-center", className)}
        {...props}
      >
        {icon ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-muted text-ink/70">
            {icon}
          </div>
        ) : null}
        <h1 className="mt-6 font-fraunces text-3xl tracking-tight text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-[430px] text-sm leading-[22px] text-ink/60">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-7">{action}</div> : null}
      </div>
    ) : (
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
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {action}
      </div>
    ),
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
