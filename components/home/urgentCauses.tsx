import { H2, P } from "../typography";
import { listCauses } from "@/actions";
import AnimatedHeader from "@/components/home/components/AnimatedHeader";
import UrgentCausesCarousel from "./UrgentCausesCarousel";

// ✅ Normalize backend cause data to match the carousel type
function normalizeCause(cause: any) {
  return {
    ...cause,
    image: cause.image ?? undefined, // convert null → undefined
    days_active: cause.days_active ?? 0, // ensure number
    goal: cause.goal ?? 0,
    raised: cause.raised ?? 0,
  };
}

export async function UrgentCauses() {
  const allCauses = await listCauses();
  const now = new Date();

  // 🔹 Filter urgent causes (first 24h, ≥1% raised)
  const urgentCauses = allCauses.filter((cause) => {
    const createdAt = new Date(cause.created_at);
    const hoursSinceCreated =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    const percentageRaised =
      cause.goal > 0 ? (cause.raised / cause.goal) * 100 : 0;

    return hoursSinceCreated <= 24 && percentageRaised >= 1;
  });

  // 🔹 Everything else is normal
  const normalCauses = allCauses.filter(
    (cause) => !urgentCauses.includes(cause),
  );

  // 🔹 Combine & normalize
  const combinedCauses = [...urgentCauses, ...normalCauses]
    .map(normalizeCause)
    .sort((a, b) => {
      const percentA = a.goal > 0 ? a.raised / a.goal : 0;
      const percentB = b.goal > 0 ? b.raised / b.goal : 0;

      // Push 0% to bottom
      if (percentA === 0 && percentB !== 0) return 1;
      if (percentB === 0 && percentA !== 0) return -1;

      // Then by amount raised
      return (b.raised || 0) - (a.raised || 0);
    });

  if (combinedCauses.length === 0) return null;

  return (
    <div className="space-y-10 relative py-12">
      <div className="flex items-start justify-between w-full relative">
        <AnimatedHeader className="flex-1">
          <H2 className="text-black text-4xl font-bold font-['Montserrat'] leading-[48px] mb-2">
            Urgent Causes
          </H2>
          <P className="text-lg text-gray-500">
            Support critical causes that are gaining rapid momentum in their
            first hours. Your timely action can make the biggest difference.
          </P>
        </AnimatedHeader>
      </div>

      <UrgentCausesCarousel causes={combinedCauses} />
    </div>
  );
}
