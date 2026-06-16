import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/lib/auth/admin-auth";
import { redirect } from "next/navigation";

const links = [
  {
    title: "API Campaigns",
    description: "Review every campaign created through the public API.",
    href: "/dashboard/admin/api-monitoring/campaigns",
    icon: FolderKanban,
  },
  {
    title: "API Donations",
    description:
      "Track processed donation volume and RefreeG's 2% fee revenue.",
    href: "/dashboard/admin/api-monitoring/donations",
    icon: Coins,
  },
  {
    title: "Campaign Reports",
    description:
      "Investigate flagged API campaigns and take them down when needed.",
    href: "/dashboard/admin/api-monitoring/reports",
    icon: AlertTriangle,
  },
  {
    title: "Usage Analytics",
    description:
      "Monitor request volume, active keys, endpoint mix, and error rates.",
    href: "/dashboard/admin/api-monitoring/usage",
    icon: BarChart3,
  },
];

import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  BarChart3,
  Coins,
  FolderKanban,
  KeyRound,
} from "lucide-react";
import { getApiMonitoringSummary } from "@/actions/api-monitoring-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ApiMonitoringPage() {
  const [session, summary] = await Promise.all([
    auth(),
    getApiMonitoringSummary(),
  ]);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const role = await getUserRole(session.user.id);

  if (role !== "admin" && role !== "manager") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to access this page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active API keys</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <KeyRound className="h-5 w-5 text-primary" />
              {summary.activeKeys}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {summary.totalKeys} issued keys across test and live modes.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>API campaigns</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <FolderKanban className="h-5 w-5 text-primary" />
              {summary.apiCampaigns}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {summary.activeCampaigns} currently active.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Donation volume</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Coins className="h-5 w-5 text-primary" />
              {summary.donationVolume}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Estimated fee revenue: {summary.platformFeeRevenue}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending reports</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-5 w-5 text-primary" />
              {summary.pendingReports}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Campaigns awaiting investigation.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total requests</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Activity className="h-5 w-5 text-primary" />
              {summary.totalRequestVolume}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Logged public API calls across the bot endpoints.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Error rate</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <BarChart3 className="h-5 w-5 text-primary" />
              {summary.requestErrorRate}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Share of logged requests returning $\ge 400$.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin tools</CardTitle>
          <CardDescription>
            Drill into the specific API surfaces you need to review.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border p-4 transition hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold">{item.title}</h2>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Badge variant="outline">Open</Badge>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
