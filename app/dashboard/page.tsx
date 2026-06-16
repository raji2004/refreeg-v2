import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardCauses } from "@/components/dashboard-causes";
import { DashboardStats } from "@/components/dashboard-stats";
import { DashboardPetitions } from "@/components/dashboard-petitions";
import { DonationTrends } from "@/components/charts/donation-trends";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowRight,
  CircleDollarSign,
  HeartHandshake,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import {
  getDashboardStats,
  getDonationTrends,
  getPetitionDashboardStats,
  getUserCausesWithStats,
  getUserPetitionsWithStats,
} from "@/actions/dashboard-actions";
import { getProfile } from "@/actions/profile-actions";
import { getMediaUrl } from "@/lib/s3/media";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Manage your causes, petitions, and track your social impact on RefreeG.",
};

const formatNaira = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; mode?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = session.user;

  const params = ((await searchParams) || {}) as {
    search?: string;
    mode?: string;
  };
  const search = params.search?.trim() || "";
  const modeFilter = params.mode || "all";

  const [stats, petitionStats, donationTrends, userCauses, userPetitions] =
    await Promise.all([
      getDashboardStats(user.id as string),
      getPetitionDashboardStats(user.id as string),
      getDonationTrends(user.id as string),
      getUserCausesWithStats(user.id as string),
      getUserPetitionsWithStats(user.id as string),
    ]);

  const profile = await getProfile(user.id as string);

  const firstName =
    profile?.full_name?.split(" ")?.[0] ||
    user.name?.split(" ")?.[0] ||
    user.email?.split("@")?.[0] ||
    "there";
  const avatarUrl =
    profile?.profile_photo || (user.image as string | undefined);
  const initials =
    firstName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join("") || "U";
  const totalRaised = Number(stats?.totalRaised ?? 0);
  const totalDonors = Number(stats?.totalDonors ?? 0);
  const activeCauses = Number(stats?.activeCauses ?? 0);
  const totalSigners = Number(petitionStats?.totalDonors ?? 0);
  const activePetitions = Number(petitionStats?.activePetitions ?? 0);
  const donationTrendData = donationTrends.map((item) => ({
    date: item.month,
    amount: Number(item.amount ?? 0),
  }));

  return (
    <div className="space-y-4 px-2 py-2 sm:space-y-6 sm:px-4 sm:py-4 lg:px-6">
      <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_22%),linear-gradient(135deg,#ffffff_0%,#eff6ff_45%,#f8fafc_100%)] px-4 pb-5 pt-4 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.55)] sm:rounded-[32px] sm:px-8 sm:pb-8 sm:pt-5">
        <div className="grid gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)] xl:items-end">
          <div>
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700 sm:text-[11px] sm:tracking-[0.22em]">
              <Sparkles className="h-3.5 w-3.5" />
              Dashboard overview
            </div>
            <div className="mt-4 flex items-center gap-3 sm:mt-5 sm:gap-5">
              <Avatar className="h-20 w-20 rounded-[26px] border-4 border-white/95 bg-blue-50 shadow-[0_24px_50px_-28px_rgba(37,99,235,0.65)] sm:h-28 sm:w-28 sm:rounded-[32px] sm:border-[5px]">
                <AvatarImage
                  src={getMediaUrl(avatarUrl)}
                  alt={user.email || firstName}
                  className="object-cover object-center"
                />
                <AvatarFallback className="rounded-[28px] bg-blue-600 text-2xl font-semibold text-white sm:text-3xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-[2rem] font-semibold leading-[0.95] tracking-tight text-slate-950 sm:text-4xl">
                  Welcome back, {firstName}.
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              Monitor donations, keep campaigns moving, and stay on top of your
              petitions, campaigns, and developer tools in one place.
            </p>

            <div className="mt-5 grid gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                href="/dashboard/causes/create"
                className="w-full sm:w-auto"
              >
                <Badge className="flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white">
                  Create cause
                </Badge>
              </Link>
              <Link
                href="/dashboard/petitions/create"
                className="w-full sm:w-auto"
              >
                <Badge
                  variant="secondary"
                  className="flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  Launch petition
                </Badge>
              </Link>
              <Link href="/dashboard/settings" className="w-full sm:w-auto">
                <Badge
                  variant="secondary"
                  className="flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  Open settings
                </Badge>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[20px] border border-white/80 bg-white/88 p-3.5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)] sm:rounded-[24px] sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Donation volume
                </p>
                <CircleDollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {formatNaira(totalRaised)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                From {totalDonors} unique donors.
              </p>
            </div>
            <div className="rounded-[20px] border border-white/80 bg-white/88 p-3.5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)] sm:rounded-[24px] sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Live campaigns
                </p>
                <HeartHandshake className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {activeCauses + activePetitions}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {activeCauses} causes and {activePetitions} petitions currently
                active.
              </p>
            </div>
            <div className="rounded-[20px] border border-white/80 bg-white/88 p-3.5 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.5)] sm:rounded-[24px] sm:p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Community reach
                </p>
                <ArrowRight className="h-4 w-4 text-blue-600" />
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                {(totalDonors + totalSigners).toLocaleString()}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Combined donors and petition signers reached.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="rounded-[24px] border border-slate-200/80 bg-white p-2 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.45)] sm:rounded-[28px] sm:p-4">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Workspace
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950">
              Manage everything in one place
            </p>
          </div>
        </div>

        <Tabs
          defaultValue={search ? "analytics" : "overview"}
          className="mt-4 space-y-5"
        >
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-slate-100 p-1 sm:max-w-md">
            <TabsTrigger
              value="overview"
              className="rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm"
            >
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <DashboardStats
              userId={user.id}
              type="all"
              initialStats={stats}
              initialPetitionStats={petitionStats}
            />
            <DashboardCauses initialCauses={userCauses} />
            <DashboardPetitions initialPetitions={userPetitions} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-5">
            <DonationTrends data={donationTrendData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
