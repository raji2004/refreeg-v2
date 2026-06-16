import { H2, P } from "../typograpy";
import { listCauses } from "@/actions";
import AnimatedHeader from "@/components/home/components/AnimatedHeader";
import UrgentCausesCarousel from "./UrgentCausesCarousel";

import { calculateDaysLeft, isCauseExpired } from "@/utils/cause/cause-utils";

// ✅ Optional: helper to normalize backend data
function normalizeCause(cause: any) {
  return {
    ...cause,
    image: cause.image ?? undefined,
    days_active: calculateDaysLeft(cause), // Return dynamic days left
    goal: cause.goal ?? 0,
    raised: cause.raised ?? 0,
  };
}

export async function TrendingCauses() {
  const allCauses = await listCauses();
  const activeCauses = allCauses.filter((c) => !isCauseExpired(c));

  const now = new Date();

  const urgentCauses = activeCauses.filter((cause) => {
    const createdAt = new Date(cause.created_at);

    const hoursSinceCreated =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    const percentageRaised =
      cause.goal > 0 ? (cause.raised / cause.goal) * 100 : 0;

    return hoursSinceCreated <= 24 && percentageRaised >= 1;
  });

  const normalCauses = activeCauses.filter(
    (cause) => !urgentCauses.includes(cause),
  );

  const combinedCauses = [...urgentCauses, ...normalCauses]
    .map(normalizeCause) // ✅ FIX: normalize all causes
    .sort((a, b) => {
      const percentA = a.goal > 0 ? a.raised / a.goal : 0;
      const percentB = b.goal > 0 ? b.raised / b.goal : 0;

      // ✅ Push 0% to bottom
      if (percentA === 0 && percentB !== 0) return 1;
      if (percentB === 0 && percentA !== 0) return -1;

      // ✅ Sort by amount raised
      return (b.raised || 0) - (a.raised || 0);
    });

  if (combinedCauses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-10 relative py-12">
      <div className="flex items-start justify-between w-full relative">
        <AnimatedHeader className="flex-1">
          <H2 className="text-black text-4xl font-bold font-['Montserrat'] leading-[48px] mb-2">
            Trending Causes
          </H2>

          <P className="text-lg text-gray-500">
            Discover the most impactful causes gaining momentum right now.
            Support, share, and make a difference!
          </P>
        </AnimatedHeader>
      </div>

      <UrgentCausesCarousel causes={combinedCauses} />
    </div>
  );
}
