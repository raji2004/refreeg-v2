import { motion } from "framer-motion";
import { Target, Users, CalendarClock } from "lucide-react";
import type { ReactNode } from "react";
import type { CauseDetail } from "../types/types";
import { fadeUp } from "../types/types";

function StatItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm shadow-[0_14px_35px_-24px_rgba(31,75,153,0.45)] backdrop-blur-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E7F0FF] text-[#2457D6]">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#72829A]">
          {label}
        </p>
        <p className="mt-0.5 truncate font-semibold text-[#10233F]">{value}</p>
      </div>
    </div>
  );
}

export function StatsRow({
  cause,
  donorsCount,
}: {
  cause: CauseDetail;
  donorsCount: number;
}) {
  return (
    <motion.div className="grid gap-3 sm:grid-cols-3" variants={fadeUp}>
      <StatItem
        icon={<Target className="h-4 w-4" />}
        label="Raised"
        value={`₦${cause.raised.toLocaleString()} of ₦${cause.goal.toLocaleString()}`}
      />
      <StatItem
        icon={<Users className="h-4 w-4" />}
        label="Supporters"
        value={`${donorsCount}`}
      />
      <StatItem
        icon={<CalendarClock className="h-4 w-4" />}
        label="Days left"
        value={`${cause.days_active}`}
      />
    </motion.div>
  );
}
