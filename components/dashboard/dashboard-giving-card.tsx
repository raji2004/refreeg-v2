"use client";

import { Eyebrow } from "@/components/ui/eyebrow";

interface DashboardGivingCardProps {
  givenSoFar: number;
  campaignsBacked: number;
  livePledges: number;
  eizaBalance?: number;
}

const formatNaira = (value: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
};

export function DashboardGivingCard({
  givenSoFar,
  campaignsBacked,
  livePledges,
  eizaBalance = 150,
}: DashboardGivingCardProps) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-subtle">
      <Eyebrow className="text-[11px] font-bold uppercase tracking-wider text-ink/50">
        Your giving
      </Eyebrow>

      <div className="mt-2">
        <p className="font-fraunces text-4xl font-medium tracking-tight text-ink">
          {formatNaira(givenSoFar)}
        </p>
        <p className="mt-1 text-xs text-ink/60">given so far</p>
      </div>

      <div className="my-4 border-t border-ink/10" />

      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink/70">Campaigns backed</span>
          <span className="font-semibold text-ink">{campaignsBacked}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink/70">Live pledges</span>
          <span className="font-semibold text-ink">{livePledges}</span>
        </div>
        {/* EIZA Balance (commented out per user request)
        <div className="flex items-center justify-between">
          <span className="text-ink/70">EIZA balance</span>
          <span className="font-semibold text-amber">{eizaBalance.toLocaleString()}</span>
        </div>
        */}
      </div>
    </div>
  );
}
