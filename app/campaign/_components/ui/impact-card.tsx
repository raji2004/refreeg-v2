import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { CauseDetail } from "../types/types";
import { fadeUp } from "../types/types";

export function ImpactCard({ cause }: { cause: CauseDetail }) {
  const impactItems =
    cause.sections
      ?.map((section) => section.heading || section.description)
      .filter(Boolean) || [];
  const fallbackImpact = [
    ...(cause.location
      ? [`Direct support for the campaign in ${cause.location}`]
      : []),
    "Funds released against reviewed campaign milestones",
    "Progress and evidence shared with supporters",
  ];
  const bullets = [...impactItems, ...fallbackImpact]
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, 3);

  return (
    <motion.div
      className="rounded-[20px] border border-[#DDE3EA] bg-white p-6 text-sm text-[#53647A] sm:p-7"
      variants={fadeUp}
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#235DA7]">
        Expected impact
      </div>
      <p className="mt-2 text-[21px] font-extrabold tracking-tight text-[#10233F]">
        Where your support goes
      </p>
      {bullets.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {bullets.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#ECF5FF]">
                <CheckCircle2 className="h-4 w-4 text-[#235DA7]" />
              </span>
              <span className="pt-1.5 text-[14px] font-semibold text-[#33445A]">
                {item}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          No impact bullets yet. The campaign creator can add them in the story
          sections.
        </p>
      )}
    </motion.div>
  );
}
