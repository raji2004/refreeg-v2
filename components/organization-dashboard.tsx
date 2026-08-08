import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { DashboardCauses } from "@/components/dashboard-causes";
import { DashboardPetitions } from "@/components/dashboard-petitions";
import { DonationTrends } from "@/components/charts/donation-trends";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

type OrganizationDashboardProps = {
  workspace: {
    name: string;
    industry: string;
    address: string;
    logoUrl: string;
    currentUserRole: string;
    members: Array<unknown>;
    invitations: Array<unknown>;
  };
  profile: {
    username?: string | null;
    is_verified?: boolean;
  } | null;
  stats: {
    totalRaised?: number | string | null;
    totalDonors?: number | string | null;
    activeCauses?: number | string | null;
  } | null;
  petitionStats: {
    totalDonors?: number | string | null;
    activePetitions?: number | string | null;
  } | null;
  donationTrends: Array<{ month: string; amount: number | string | null }>;
  causes: any[];
  petitions: any[];
};

const formatNaira = (value: number | string | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
};

export function OrganizationDashboard({
  workspace,
  profile,
  stats,
  petitionStats,
  donationTrends,
  causes,
  petitions,
}: OrganizationDashboardProps) {
  const logoUrl = getMediaUrl(workspace.logoUrl);
  const activeCampaigns =
    Number(stats?.activeCauses ?? 0) +
    Number(petitionStats?.activePetitions ?? 0);
  const publicProfileHref = profile?.username
    ? `/${profile.username}`
    : "/dashboard/settings/profile";
  const personalProfileHref = profile?.username
    ? `/${profile.username}?view=personal`
    : "/dashboard/settings/profile";
  const trendData = donationTrends.map((item) => ({
    date: item.month,
    amount: Number(item.amount ?? 0),
  }));

  const metrics = [
    {
      label: "Funds raised",
      value: formatNaira(stats?.totalRaised),
      detail: "Across approved causes",
      icon: CircleDollarSign,
    },
    {
      label: "Supporters",
      value: Number(stats?.totalDonors ?? 0).toLocaleString(),
      detail: "Unique campaign donors",
      icon: UsersRound,
    },
    {
      label: "Active campaigns",
      value: activeCampaigns.toLocaleString(),
      detail: "Causes and petitions",
      icon: FileText,
    },
    {
      label: "Team members",
      value: workspace.members.length.toLocaleString(),
      detail: `${workspace.invitations.length} pending invitation${workspace.invitations.length === 1 ? "" : "s"}`,
      icon: Building2,
    },
  ];

  return (
    <div className="space-y-6 px-2 py-2 sm:px-4 sm:py-4 lg:px-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 sm:h-24 sm:w-24">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${workspace.name} logo`}
                  width={96}
                  height={96}
                  className="h-full w-full object-contain p-1"
                  unoptimized={isProxyMediaUrl(logoUrl)}
                  priority
                />
              ) : (
                <Building2 className="h-9 w-9 text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Organisation workspace
                </p>
                <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-500">
                  {workspace.currentUserRole}
                </span>
              </div>
              <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight text-slate-950">
                {workspace.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {[workspace.industry, workspace.address].filter(Boolean).join(" · ") ||
                  "Manage your organisation activity and team."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-950">
              <Link href={personalProfileHref}>
                <UserRound className="mr-2 h-4 w-4" />
                My profile
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-950">
              <Link href={publicProfileHref}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Organisation profile
              </Link>
            </Button>
            <Button asChild className="bg-blue-700 text-white hover:bg-blue-800">
              <Link href="/dashboard/settings/organization">
                <Settings className="mr-2 h-4 w-4" />
                Organisation settings
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid border-t border-slate-200 bg-slate-50/70 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className={`p-5 ${
                  index > 0 ? "border-t border-slate-200 sm:border-l sm:border-t-0" : ""
                } ${index === 2 ? "sm:border-l-0 xl:border-l" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {metric.label}
                  </p>
                  <Icon className="h-4 w-4 text-blue-700" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-950">{metric.value}</p>
                <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Workspace status</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {profile?.is_verified
                  ? "The workspace owner is verified. Your organisation can access protected fundraising and payout features."
                  : "Owner verification is still required before the organisation can access fundraising and payouts."}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-950">
            <Link href="/dashboard/settings/organization">
              <UsersRound className="mr-2 h-4 w-4" />
              Manage team
            </Link>
          </Button>
          <Button asChild className="bg-blue-700 text-white hover:bg-blue-800">
            <Link href="/dashboard/causes/create">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Create cause
            </Link>
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Portfolio
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Campaign performance
          </h2>
        </div>

        <Tabs defaultValue="campaigns" className="mt-5 space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-slate-100 p-1 sm:max-w-sm">
            <TabsTrigger value="campaigns" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-5">
            <DashboardCauses initialCauses={causes} />
            <DashboardPetitions initialPetitions={petitions} />
          </TabsContent>
          <TabsContent value="analytics">
            <DonationTrends data={trendData} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
