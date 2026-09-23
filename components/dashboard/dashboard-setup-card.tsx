"use client";

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Eyebrow } from "@/components/ui/eyebrow";

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  href?: string;
}

interface DashboardSetupCardProps {
  items: ChecklistItem[];
}

export function DashboardSetupCard({ items }: DashboardSetupCardProps) {
  const completedCount = items.filter((item) => item.done).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-subtle">
      <div className="flex items-center justify-between">
        <Eyebrow className="text-[11px] font-bold uppercase tracking-wider text-ink/50">
          Finish setting up
        </Eyebrow>
        <span className="text-xs font-medium text-ink/60">
          {completedCount} of {totalCount}
        </span>
      </div>

      <div className="mt-2.5">
        <Progress value={progressPercent} indicatorVariant="cyan" className="h-1 bg-[#f0ede6]" />
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => {
          if (item.done) {
            return (
              <div key={item.id} className="flex items-center gap-3 text-sm text-ink/75">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0b5d3b] text-white">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
                <span className="font-medium text-ink/80">{item.label}</span>
              </div>
            );
          }

          const content = (
            <div className="group flex items-center justify-between gap-3 text-sm transition-colors hover:text-ink">
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink/25 bg-white transition-colors group-hover:border-ink/50" />
                <span className="font-semibold text-ink">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-ink/40 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </div>
          );

          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className="block">
                {content}
              </Link>
            );
          }

          return <div key={item.id}>{content}</div>;
        })}
      </div>
    </div>
  );
}
