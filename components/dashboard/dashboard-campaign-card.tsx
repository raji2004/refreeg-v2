"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { GiveModal } from "@/components/discover/give-modal";
import { PledgeModal } from "@/components/discover/pledge-modal";
import { calculateDaysLeft, isCauseExpired } from "@/utils/cause/cause-utils";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { causePublicPath } from "@/lib/causes/slug";
import type { Cause } from "@/types/cause-types";

export type DashboardCause = Cause & {
  profiles?: { full_name?: string | null; is_verified?: boolean };
};

interface DashboardCampaignCardProps {
  cause: DashboardCause;
  giftCount: number;
}

const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000) {
    const millions = (value / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `₦${millions}M`;
  }
  if (value >= 1_000) {
    const thousands = (value / 1_000).toFixed(0);
    return `₦${thousands}K`;
  }
  return `₦${value.toLocaleString()}`;
};

export function DashboardCampaignCard({
  cause,
  giftCount,
}: DashboardCampaignCardProps) {
  const [giveOpen, setGiveOpen] = useState(false);
  const [pledgeOpen, setPledgeOpen] = useState(false);

  const daysLeft = calculateDaysLeft(cause);
  const isExpired = isCauseExpired(cause);
  const raised = Number(cause.raised || 0);
  const goal = Number(cause.goal || 0);
  const percentFunded =
    goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
  const orgName = cause.profiles?.full_name || "RefreeG Community";
  const isVerified = !!cause.profiles?.is_verified;

  const orgInitials =
    orgName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase())
      .join("") || "RG";

  const badge = isExpired
    ? { label: "Ended", className: "bg-slate-700 font-bold text-white" }
    : cause.paused
      ? { label: "Paused", className: "bg-gold font-bold text-ink" }
      : daysLeft > 0 && daysLeft <= 14
        ? {
            label: `Urgent · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`,
            className: "bg-rust font-bold text-white",
          }
        : daysLeft > 14
          ? {
              label: `${daysLeft} days left`,
              className: "bg-ink/75 font-medium text-white backdrop-blur-sm",
            }
          : null;
  const canGive = !isExpired && !cause.paused;

  const publicHref = causePublicPath(cause);
  const imageUrl = getMediaUrl(cause.image) || "/placeholder.svg";

  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-subtle transition-shadow hover:shadow-md">
        <Link
          href={publicHref}
          className="group relative block aspect-[16/9] w-full overflow-hidden bg-ink/5"
        >
          <Image
            src={imageUrl}
            alt={cause.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized={isProxyMediaUrl(imageUrl)}
          />
          {badge && (
            <div className="absolute left-3 top-3">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] uppercase tracking-wider shadow-sm ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>
          )}
        </Link>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <Link href={publicHref} className="group">
            <h3 className="line-clamp-2 font-fraunces text-xl font-medium text-ink transition-colors group-hover:text-forest">
              {cause.title}
            </h3>
          </Link>

          {/* Org / Creator */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime/70 text-[10px] font-bold text-ink">
              {orgInitials}
            </div>
            <span className="truncate text-xs text-ink/70">
              {orgName} {isVerified ? "· Verified" : ""}
            </span>
          </div>

          {/* Cyan Progress Bar */}
          <div className="mt-4">
            <Progress
              value={percentFunded}
              indicatorVariant="cyan"
              className="h-1.5 bg-[#f0ede6]"
            />
          </div>

          {/* Stats Row */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-baseline gap-1 text-ink">
              <span className="font-bold">{formatCompactCurrency(raised)}</span>
              <span className="text-ink/60">
                of {formatCompactCurrency(goal)}
              </span>
            </div>
            <span className="text-ink/60">
              {giftCount > 0
                ? `${giftCount.toLocaleString()} gave`
                : "Be the first to give"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="ink"
              className="flex-1 rounded-xl py-2 text-sm font-medium"
              disabled={!canGive}
              onClick={() => setGiveOpen(true)}
            >
              Give now
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-ink/15 bg-white px-5 py-2 text-sm font-medium text-ink hover:bg-ink/5"
              disabled={!canGive}
              onClick={() => setPledgeOpen(true)}
            >
              Pledge
            </Button>
          </div>
        </div>
      </div>

      <GiveModal
        causeId={cause.id}
        open={giveOpen}
        onOpenChange={setGiveOpen}
      />
      <PledgeModal
        causeId={cause.id}
        causeTitle={cause.title}
        daysActive={daysLeft > 0 ? daysLeft : null}
        open={pledgeOpen}
        onOpenChange={setPledgeOpen}
      />
    </>
  );
}
