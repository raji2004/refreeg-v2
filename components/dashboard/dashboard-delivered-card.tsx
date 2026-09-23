"use client";

import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";

interface DashboardDeliveredCardProps {
  amount: number;
  campaignsCount?: number;
}

const formatNaira = (value: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
};

export function DashboardDeliveredCard({
  amount,
  campaignsCount = 0,
}: DashboardDeliveredCardProps) {
  return (
    <div className="rounded-2xl bg-[#0b5d3b] p-5 text-white shadow-subtle">
      <Eyebrow className="text-[11px] font-bold uppercase tracking-wider text-lime/90">
        Delivered this week
      </Eyebrow>

      <p className="mt-1.5 font-fraunces text-3xl font-medium tracking-tight text-white sm:text-4xl">
        {formatNaira(amount)}
      </p>

      <p className="mt-2 text-xs leading-relaxed text-white/80">
        Across {campaignsCount} {campaignsCount === 1 ? "campaign" : "campaigns"}, every naira receipted.{" "}
        <Link href="/causes" className="underline underline-offset-2 transition-colors hover:text-lime">
          See the ledger.
        </Link>
      </p>
    </div>
  );
}
