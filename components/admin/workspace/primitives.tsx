"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Metric, Tone } from "./types";

export const toneClasses: Record<Tone, string> = {
  green: "bg-forest/15 text-forest",
  red: "bg-rust/15 text-rust",
  gold: "bg-gold/30 text-amber",
  blue: "bg-blue-accent/15 text-blue-accent",
  neutral: "bg-ink/[0.07] text-ink/80",
};
export function Chip({
  children,
  tone = "green",
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "gap-1.5 whitespace-nowrap border-0 px-2 py-1 text-xs font-semibold leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </Badge>
  );
}
export function Panel({
  children,
  className,
  title,
  aside,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <Card
      variant="surface"
      className={cn("min-w-0 rounded-2xl border-0 p-5 shadow-none", className)}
    >
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </Card>
  );
}
export function MetricCards({
  metrics,
  loading = false,
}: {
  metrics: Metric[];
  loading?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-busy={loading}>
      {metrics.map((metric) => (
        <Panel key={metric.label} className="min-h-[97px]">
          {loading ? (
            <>
              <Skeleton className="h-3 w-24 bg-ink/[0.08]" />
              <Skeleton className="mt-3 h-7 w-36 bg-ink/[0.08]" />
            </>
          ) : (
            <>
              <p className="text-xs text-ink/60">{metric.label}</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                <p className="font-sans text-[27px] font-semibold leading-none tracking-[-1px] tabular-nums">
                  {metric.value}
                </p>
                {metric.change && (
                  <Chip
                    tone={metric.tone}
                    className="max-w-[48%] whitespace-normal"
                  >
                    {metric.change}
                  </Chip>
                )}
              </div>
            </>
          )}
        </Panel>
      ))}
    </div>
  );
}
export function Person({
  name,
  detail,
  initials,
  tone = "neutral",
}: {
  name: string;
  detail?: string;
  initials: string;
  tone?: Tone;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-ink",
          toneClasses[tone],
        )}
      >
        {initials}
      </span>
      <div className="min-w-0">
        <span className="block truncate text-[13px] font-semibold leading-tight">
          {name}
        </span>
        {detail && (
          <span className="mt-0.5 block truncate text-xs font-normal leading-tight text-ink/60">
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}
