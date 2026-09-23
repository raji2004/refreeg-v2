import { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getDashboardStats,
  getDonationTrends,
  getPetitionDashboardStats,
  getUserCausesWithStats,
  getUserPetitionsWithStats,
  getUserDonorGivingStats,
  getPlatformWeeklyDeliveredStats,
} from "@/actions/dashboard-actions";
import { getProfile, hasBankDetails } from "@/actions/profile-actions";
import { getOrganizationWorkspace } from "@/actions/organization-actions";
import { getMatchedCauses, getMatchedCausesCount } from "@/actions/interest-actions";
import { countCauses, listCauses } from "@/actions/cause-actions";
import { OrganizationDashboard } from "@/components/organization-dashboard";
import { DashboardFirstDonationBanner } from "@/components/dashboard/dashboard-first-donation-banner";
import { DashboardCampaignCard } from "@/components/dashboard/dashboard-campaign-card";
import { DashboardGivingCard } from "@/components/dashboard/dashboard-giving-card";
import { DashboardSetupCard } from "@/components/dashboard/dashboard-setup-card";
import { DashboardBountiesBanner } from "@/components/dashboard/dashboard-bounties-banner";
import { DashboardDeliveredCard } from "@/components/dashboard/dashboard-delivered-card";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Manage your causes, petitions, and track your social impact on RefreeG.",
};

const interestLabelMap: Record<string, string> = {
  education: "EDUCATION",
  health: "HEALTH",
  "disaster-relief": "DISASTER RELIEF",
  water: "WATER",
  "small-business": "SMALL BUSINESS",
  "women-girls": "WOMEN & GIRLS",
  accountability: "ACCOUNTABILITY",
  climate: "CLIMATE",
  "skills-bounties": "SKILLS & BOUNTIES",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = session.user;

  const [profile, donorStats, weeklyStats, hasBank] = await Promise.all([
    getProfile(user.id as string),
    getUserDonorGivingStats(user.id as string),
    getPlatformWeeklyDeliveredStats(),
    hasBankDetails(user.id as string),
  ]);

  if (profile?.account_type === "organization") {
    const [organizationResult, stats, petitionStats, donationTrends, userCauses, userPetitions] =
      await Promise.all([
        getOrganizationWorkspace(),
        getDashboardStats(user.id as string),
        getPetitionDashboardStats(user.id as string),
        getDonationTrends(user.id as string),
        getUserCausesWithStats(user.id as string),
        getUserPetitionsWithStats(user.id as string),
      ]);

    if (organizationResult.success) {
      return (
        <OrganizationDashboard
          workspace={organizationResult.workspace}
          profile={profile}
          stats={stats}
          petitionStats={petitionStats}
          donationTrends={donationTrends}
          causes={userCauses}
          petitions={userPetitions}
        />
      );
    }
  }

  const firstName =
    profile?.full_name?.split(" ")?.[0] ||
    user.name?.split(" ")?.[0] ||
    user.email?.split("@")?.[0] ||
    "there";

  const interests = profile?.interests || [];
  const [matchedCauses, matchedCount, totalCausesCount] = await Promise.all([
    getMatchedCauses(interests, 4),
    getMatchedCausesCount(interests),
    countCauses({ status: "approved" }),
  ]);

  let displayCauses = matchedCauses;
  if (displayCauses.length === 0) {
    displayCauses = await listCauses({ limit: 4 });
  }

  const displayedCategories = Array.from(
    new Set(displayCauses.map((c) => c.category).filter(Boolean)),
  ).slice(0, 3);

  const interestsDisplay =
    interests.length > 0
      ? interests
          .map((id) => interestLabelMap[id] || id.replace(/-/g, " ").toUpperCase())
          .slice(0, 3)
          .join(", ")
      : displayedCategories.length > 0
        ? displayedCategories.map((c) => c.replace(/-/g, " ").toUpperCase()).join(", ")
        : "COMMUNITY CAUSES";

  const causesCountWord =
    displayCauses.length === 1 ? "one campaign" : `${displayCauses.length} campaigns`;
  const subtitle =
    displayCauses.length > 0
      ? interests.length > 0
        ? `Your account is ready. Here are ${causesCountWord} from the causes you picked.`
        : `Your account is ready. Here are ${causesCountWord} you can support today.`
      : "Your account is ready. Browse campaigns from causes across Nigeria.";

  const seeAllCount = matchedCount > 0 ? matchedCount : totalCausesCount;
  const hasPhone = !!(profile?.phone || (user as any).phone);

  const checklist = [
    hasPhone
      ? { id: "number-confirmed", label: "Number confirmed", done: true }
      : {
          id: "number-confirmed",
          label: "Confirm phone number",
          done: false,
          href: "/dashboard/settings/profile",
        },
    {
      id: "payment-method",
      label: "Add a payment method",
      done: hasBank,
      href: "/dashboard/settings",
    },
    {
      id: "verify-identity",
      label: "Verify your identity",
      done: !!profile?.is_verified,
      href: "/dashboard/settings/kyc-setup",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-fraunces text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-sm text-ink/70">{subtitle}</p>
        </div>

        <Link href="/dashboard/causes/create" className="shrink-0">
          <Button variant="ink" className="gap-1.5 rounded-xl px-4 py-2 text-sm font-medium">
            <Plus className="h-4 w-4" />
            Start a campaign
          </Button>
        </Link>
      </div>

      {/* Callout Banner */}
      <div className="mt-6">
        <DashboardFirstDonationBanner
          hasDonated={donorStats.givenSoFar > 0}
          points={profile?.total_points ?? 150}
        />
      </div>

      {/* Main 2-Column Grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column (Main content, 8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-ink/60 uppercase">
              MATCHED TO {interestsDisplay}
            </span>
            <Link
              href="/causes"
              className="text-sm font-semibold text-blue-accent hover:underline"
            >
              See all {seeAllCount}
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {displayCauses.map((cause) => (
              <DashboardCampaignCard key={cause.id} cause={cause} />
            ))}
          </div>
        </div>

        {/* Right Column (Widgets, 4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <DashboardGivingCard
            givenSoFar={donorStats.givenSoFar}
            campaignsBacked={donorStats.campaignsBacked}
            livePledges={donorStats.livePledges}
            eizaBalance={profile?.total_points || 150}
          />

          <DashboardSetupCard items={checklist} />

          <DashboardBountiesBanner location={profile?.location} />

          <DashboardDeliveredCard
            amount={weeklyStats.amount}
            campaignsCount={weeklyStats.campaignsCount}
          />
        </div>
      </div>
    </div>
  );
}
