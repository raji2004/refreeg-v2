import { Users, CreditCard, TrendingUp } from "lucide-react";
import { AnalyticsCard } from "@/components/analytics-card";
import {
  getDashboardStats,
  getPetitionDashboardStats,
} from "@/actions/dashboard-actions";

const formatNaira = (value: number | string | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
};

export async function DashboardStats({
  type = "all",
  userId,
  initialStats,
  initialPetitionStats,
}: {
  type?: "cause" | "petition" | "all";
  userId?: string;
  initialStats?: any;
  initialPetitionStats?: any;
}) {
  if (!userId) return null;
  
  let stats = initialStats;
  if (!stats && (type === "cause" || type === "all")) {
    stats = await getDashboardStats(userId);
  }
  
  let petitionStats = initialPetitionStats;
  if (!petitionStats && (type === "petition" || type === "all")) {
    petitionStats = await getPetitionDashboardStats(userId);
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {stats && (
        <>
          <AnalyticsCard
            title="Total Raised"
            value={formatNaira(stats.totalRaised ?? 0)}
            description="Total donation volume across your approved causes."
            icon={CreditCard}
          />
          <AnalyticsCard
            title="Total Donors"
            value={stats.totalDonors ?? 0}
            description="Unique supporters who contributed to your causes."
            icon={Users}
          />
          <AnalyticsCard
            title="Active Causes"
            value={stats.activeCauses ?? 0}
            description="Approved causes currently visible to supporters."
            icon={TrendingUp}
          />
        </>
      )}
      {petitionStats && (
        <>
          <AnalyticsCard
            title="Unique Signers"
            value={petitionStats.totalDonors ?? 0}
            description="Distinct people who have signed your petitions."
            icon={Users}
          />
          <AnalyticsCard
            title="Active Petitions"
            value={petitionStats.activePetitions ?? 0}
            description="Approved petitions actively collecting signatures."
            icon={TrendingUp}
          />
        </>
      )}
    </div>
  );
}
