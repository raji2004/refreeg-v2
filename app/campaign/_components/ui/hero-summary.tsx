import { motion } from "framer-motion";
import { BadgeCheck, MapPin, Users } from "lucide-react";
import { getCampaignCategoryStyle } from "@/lib/campaign-categories";
import { cn } from "@/lib/utils";
import type { CauseDetail } from "../types/types";
import { fadeUp } from "../types/types";

export function HeroSummary({
  cause,
  donorsCount,
}: {
  cause: CauseDetail;
  donorsCount: number;
}) {
  const verified = cause.status === "approved";
  const categoryStyle = getCampaignCategoryStyle(cause.category);
  const CategoryIcon = categoryStyle.icon;

  return (
    <motion.div
      className="rounded-2xl border border-[#CBD7E4] bg-[linear-gradient(135deg,#F9FCFF_0%,#E6F0FF_52%,#EEF8F6_100%)] p-4 sm:rounded-[22px] sm:p-7"
      variants={fadeUp}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
            verified
              ? "bg-[#2563EB]/10 text-[#2563EB]"
              : "bg-[#F59E0B]/15 text-[#B66A00]"
          }`}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          {verified ? "Verified" : "In review"}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold",
            categoryStyle.badgeClassName,
          )}
        >
          <CategoryIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          {categoryStyle.name} cause
        </span>
      </div>

      <div className="flex max-w-3xl flex-col gap-3 sm:gap-4">
        <h1 className="text-2xl font-extrabold leading-[1.2] tracking-[-0.02em] text-[#10233F] sm:text-[32px]">
          {cause.title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-[#53647A] sm:text-[15px] sm:leading-7">
          {cause.summary ||
            "Verified, milestone-based relief with evidence-locked releases and transparent updates."}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#33445A] sm:text-[13px]">
          {cause.location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#235DA7]" />
              {cause.location}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-[#235DA7]" />
            {donorsCount} supporters
          </span>
        </div>
      </div>
    </motion.div>
  );
}
