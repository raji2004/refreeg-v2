import { motion } from "framer-motion";
import { CalendarClock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { CauseDetail } from "../types/types";
import { fadeUp } from "../types/types";

const ShareModal = dynamic(
  () => import("@/components/share-modal").then((mod) => mod.ShareModal),
  {
    loading: () => <Skeleton className="h-10 w-10 rounded-full" />,
  },
);

export function ProgressCard({
  cause,
  percentRaised,
  shareUrl,
}: {
  cause: CauseDetail;
  percentRaised: number;
  shareUrl: string;
}) {
  return (
    <motion.div
      className="rounded-2xl border border-[#DDE3EA] bg-white p-4 sm:rounded-[20px] sm:p-7"
      variants={fadeUp}
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#235DA7]">
          Funding progress
        </p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#E6F6D2] px-3 py-1.5 text-xs font-bold text-[#31551A]">
            {percentRaised}% funded
          </span>
          <ShareModal
            url={shareUrl}
            title={cause.title}
            entityId={cause.id}
            entityType="cause"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1 sm:mt-5">
        <p className="text-[28px] font-extrabold tabular-nums tracking-tight text-[#10233F] sm:text-[32px]">
          ₦{cause.raised.toLocaleString()}
        </p>
        <p className="text-sm text-slate-500">
          raised of ₦{cause.goal.toLocaleString()}
        </p>
      </div>
      <Progress
        value={percentRaised}
        className="mt-4 h-2.5 bg-[#E8EDF2] sm:mt-5 [&>div]:bg-[#235DA7]"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-[#65758B]">
        <span>
          ₦{cause.raised.toLocaleString()} raised • {percentRaised}% funded
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECF5FF] px-3 py-1.5 font-bold text-[#235DA7]">
          <CalendarClock className="h-3.5 w-3.5" />
          {cause.days_active} days left
        </span>
      </div>
    </motion.div>
  );
}
