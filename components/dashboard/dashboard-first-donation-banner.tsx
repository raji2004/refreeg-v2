"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardFirstDonationBannerProps {
  hasDonated?: boolean;
  points?: number;
}

export function DashboardFirstDonationBanner({
  hasDonated = false,
  points = 150,
}: DashboardFirstDonationBannerProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-[#f4e6c1] p-4 sm:p-5 shadow-subtle">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-lime shadow-sm">
          <Heart className="h-5 w-5 fill-current" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">
            {hasDonated ? "Continue your giving journey" : "Make your first donation"}
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-ink/75">
            {hasDonated
              ? "Explore verified campaigns and track your ongoing impact with transparent receipts."
              : `Give any amount to see how receipts and rewards work. You keep the ${points} points either way.`}
          </p>
        </div>
      </div>

      <Link href="/causes" className="shrink-0">
        <Button variant="ink" className="w-full sm:w-auto rounded-xl px-5 py-2.5 text-sm font-medium">
          {hasDonated ? "Explore campaigns" : "Pick a campaign"}
        </Button>
      </Link>
    </div>
  );
}
