"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

interface DashboardBountiesBannerProps {
  location?: string | null;
  count?: number;
}

export function DashboardBountiesBanner({
  location,
  count = 41,
}: DashboardBountiesBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const locationText = location?.trim() ? `in ${location.trim()}` : "near you";

  return (
    <div className="relative rounded-2xl border border-ink/10 bg-[#f4e6c1] p-5 shadow-subtle">
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-4 rounded-full p-1 text-ink/50 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <Eyebrow className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
        From RefreeG
      </Eyebrow>

      <h4 className="mt-1 font-fraunces text-base font-medium text-ink">
        {count} bounties are open {locationText}
      </h4>

      <p className="mt-1 text-xs text-ink/75">
        Photography, Hausa and translation work. Paid in naira and EIZA.
      </p>

      <Link href="/bounties" className="mt-3.5 block">
        <Button
          type="button"
          variant="ink"
          className="w-full rounded-xl py-2 text-xs font-medium"
        >
          See bounties
        </Button>
      </Link>
    </div>
  );
}
