import Link from "next/link";
import { CircleCheck, Circle, HeartHandshake, Sparkles } from "lucide-react";
import { CauseCard } from "@/components/cause-card";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Button } from "@/components/ui/button";
import type { Cause } from "@/types/cause-types";

interface ChecklistItem {
  label: string;
  done: boolean;
  href?: string;
}

interface DashboardFirstRunProps {
  matchedCauses: Cause[];
  matchedCount: number;
  checklist: ChecklistItem[];
  weeklyDelivered: number;
}

const formatNaira = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

/**
 * First-run content for a freshly onboarded account — shown above the rest
 * of the existing (navy-themed) dashboard, styled with the cream/ink/gold
 * tokens per docs/DESIGN_GUIDE.md.
 */
export function DashboardFirstRun({
  matchedCauses,
  matchedCount,
  checklist,
  weeklyDelivered,
}: DashboardFirstRunProps) {
  return (
    <div className="space-y-4 rounded-[24px] border border-ink/10 bg-cream p-4 sm:rounded-[28px] sm:p-6">
      <CalloutBanner
        variant="gold"
        icon={<Sparkles className="mt-0.5 h-5 w-5 shrink-0" />}
        title={`${formatNaira(weeklyDelivered)} delivered to causes this week`}
        description="That's the whole community — donors like you keep it moving."
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow>Matched to your interests</Eyebrow>
              <h2 className="mt-1 font-fraunces text-xl font-semibold text-ink">
                Campaigns worth a look
              </h2>
            </div>
            {matchedCount > matchedCauses.length && (
              <Link href="/causes" className="text-sm font-medium text-ink underline">
                See all {matchedCount}
              </Link>
            )}
          </div>

          {matchedCauses.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {matchedCauses.map((cause) => (
                <CauseCard key={cause.id} cause={cause} />
              ))}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-dashed border-ink/20 p-5">
              <HeartHandshake className="h-5 w-5 text-ink/50" />
              <p className="text-sm text-ink/70">
                No live matches for your interests yet — browse Discover to find
                a cause to support.
              </p>
              <Link href="/causes">
                <Button variant="ink">Browse Discover</Button>
              </Link>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-ink/10 bg-white p-4">
          <Eyebrow>Finish setting up</Eyebrow>
          <ul className="mt-3 space-y-3">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-sm">
                {item.done ? (
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink/30" />
                )}
                {item.href && !item.done ? (
                  <Link href={item.href} className="text-ink underline">
                    {item.label}
                  </Link>
                ) : (
                  <span className={item.done ? "text-ink/60 line-through" : "text-ink"}>
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
