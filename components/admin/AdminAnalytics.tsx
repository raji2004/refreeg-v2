"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DateRange } from "react-day-picker";
import { addDays, subDays } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import {
  useAdminAnalytics,
  useAnalyticsCharts,
  useOperationalAnalytics,
} from "@/hooks/use-admin-analytics";
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  AlertTriangle,
  Download,
  FileText,
  CreditCard,
  Clock,
} from "lucide-react";
import { AnalyticsCard } from "@/components/analytics-card";
import { TimeRangeSelector } from "@/components/ui/time-range-selector";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAnalytics() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdminOrManager, isLoading: adminLoading } = useAdmin(user?.id);

  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const fromStr = date?.from?.toISOString();
  const toStr = date?.to?.toISOString();

  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useAdminAnalytics(fromStr, toStr);

  const {
    donationTrends,
    userGrowth,
    causeCategories,
    isLoading: chartsLoading,
  } = useAnalyticsCharts(fromStr, toStr);

  const {
    kyc,
    payments,
    lifecycle,
    alerts,
    isLoading: opLoading,
  } = useOperationalAnalytics(fromStr, toStr);

  useEffect(() => {
    if (!adminLoading && !isAdminOrManager && user) {
      router.push("/dashboard");
    }
  }, [user, adminLoading, isAdminOrManager, router]);

  const handleExport = () => {
    if (!analytics || !donationTrends) return;

    let csvContent = "data:text/csv;charset=utf-8,";

    csvContent += "SUMMARY METRICS\n";
    csvContent += "Metric,Current,Trend,Previous\n";
    csvContent += `Total Donations,${analytics.totalDonations.current},${analytics.totalDonations.trend}%,${analytics.totalDonations.previous}\n`;
    csvContent += `Total Users,${analytics.totalUsers.current},${analytics.totalUsers.trend}%,-\n`;
    csvContent += `Active Causes,${analytics.activeCauses.active}/${analytics.activeCauses.total},-,-\n`;
    csvContent += "\n";

    // Donation Trends
    csvContent += "DONATION TRENDS\n";
    csvContent += "Period,Regular,Crypto,Total,Count\n";
    donationTrends.forEach((d) => {
      csvContent += `${d.period},${d.regular},${d.crypto},${d.total},${d.count}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `analytics_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (adminLoading || analyticsLoading || chartsLoading || opLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!isAdminOrManager) {
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

  if (analyticsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>
            Failed to load analytics data: {analyticsError}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data</CardTitle>
          <CardDescription>Unable to load analytics data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Chart Configs
  const donationConfig = {
    regular: {
      label: "Regular (₦)",
      color: "#2563eb",
    },
    crypto: {
      label: "Crypto (₦)",
      color: "#16a34a",
    },
  } satisfies ChartConfig;

  const userConfig = {
    users: {
      label: "New Users",
      color: "#2563eb",
    },
    active: {
      label: "Active",
      color: "#f59e0b",
    },
  } satisfies ChartConfig;

  const causeCategoryConfig = {
    total: {
      label: "Total Causes",
      color: "#8884d8",
    },
  } satisfies ChartConfig;

  const causeStatusConfig = {
    approved: {
      label: "Approved",
      color: "#16a34a",
    },
    pending: {
      label: "Pending",
      color: "#f59e0b",
    },
    completed: {
      label: "Completed",
      color: "#2563eb",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Platform statistics and performance metrics.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-auto">
            <TimeRangeSelector date={date} setDate={setDate} />
          </div>
          <div>
            <Button
              variant="outline"
              onClick={handleExport}
              className="w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-md border flex items-center gap-3 ${alert.type === "critical" ? "bg-red-50 border-red-200 text-red-800" : "bg-yellow-50 border-yellow-200 text-yellow-800"}`}
            >
              <AlertTriangle className="h-5 w-5" />
              <div className="flex-1">
                <p className="font-semibold">{alert.message}</p>
                <p className="text-sm opacity-90">
                  {alert.metric}: {alert.value} (Threshold: {alert.threshold})
                </p>
              </div>
              <Button variant="ghost" size="sm">
                Dismiss
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard
          title="Total Donations"
          value={analytics.totalDonations.current}
          description={`${analytics.totalDonations.trend > 0 ? "+" : ""}${analytics.totalDonations.trend}% vs prev period`}
          icon={DollarSign}
        />
        <AnalyticsCard
          title="Total Users"
          value={String(analytics.totalUsers.current)}
          description={`+${analytics.totalUsers.newInPeriod} new in period`}
          icon={Users}
        />
        <AnalyticsCard
          title="Active Causes"
          value={`${analytics.activeCauses.active} / ${analytics.activeCauses.total}`}
          description="Active / Total Causes"
          icon={Activity}
        />
        <AnalyticsCard
          title="Pending Approvals"
          value={String(analytics.pendingApprovals.current)}
          description="Requires attention"
          icon={TrendingUp}
        />
      </div>

      <Tabs defaultValue="donations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="causes">Causes</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="donations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Donation Trends</CardTitle>
              <CardDescription>
                Volume over time (Regular vs Crypto)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={donationConfig}
                className="h-[400px] w-full"
              >
                <BarChart data={donationTrends}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₦${value.toLocaleString()}`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="regular"
                    fill="var(--color-regular)"
                    radius={4}
                    stackId="a"
                  />
                  <Bar
                    dataKey="crypto"
                    fill="var(--color-crypto)"
                    radius={4}
                    stackId="a"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>
                New user registrations over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={userConfig} className="h-[400px] w-full">
                <LineChart data={userGrowth}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="var(--color-users)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="active"
                    stroke="var(--color-active)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="causes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Causes by Category</CardTitle>
                <CardDescription>Distribution of total causes</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={causeCategoryConfig}
                  className="h-[400px] w-full"
                >
                  <BarChart
                    data={causeCategories}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="category"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={100}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>
                  Approved vs Pending vs Completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={causeStatusConfig}
                  className="h-[400px] w-full"
                >
                  <BarChart data={causeCategories}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="category"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="approved"
                      fill="var(--color-approved)"
                      radius={4}
                      stackId="a"
                    />
                    <Bar
                      dataKey="pending"
                      fill="var(--color-pending)"
                      radius={4}
                      stackId="a"
                    />
                    <Bar
                      dataKey="completed"
                      fill="var(--color-completed)"
                      radius={4}
                      stackId="a"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* KYC Module */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  KYC Analytics
                </CardTitle>
                <CardDescription>Verification performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Requests
                    </p>
                    <p className="text-2xl font-bold">{kyc?.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Approval Rate
                    </p>
                    <p
                      className={`text-2xl font-bold ${(kyc?.approvalRate || 0) > 80 ? "text-green-600" : "text-yellow-600"}`}
                    >
                      {kyc?.approvalRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Pending
                    </p>
                    <p className="text-2xl font-bold">{kyc?.pending || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Avg Time
                    </p>
                    <p className="text-2xl font-bold">
                      {kyc?.avgProcessingTimeHours.toFixed(1)}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Failed Payments */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Health
                </CardTitle>
                <CardDescription>Transaction success metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Txns
                    </p>
                    <p className="text-2xl font-bold">{payments?.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Failure Rate
                    </p>
                    <p
                      className={`text-2xl font-bold ${(payments?.failureRate || 0) < 5 ? "text-green-600" : "text-red-600"}`}
                    >
                      {payments?.failureRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Failed Amount
                    </p>
                    <p className="text-xl font-bold text-red-600">
                      {new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      }).format(payments?.failedAmount || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cause Lifecycle */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Lifecycle
                </CardTitle>
                <CardDescription>Cause progression stats</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Created</span>
                    <span className="font-bold">
                      {lifecycle?.funnel.created}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pending Review</span>
                    <span className="font-bold">
                      {lifecycle?.funnel.pending}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Approved</span>
                    <span className="font-bold text-green-600">
                      {lifecycle?.funnel.approved}
                    </span>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground">
                      Avg Approval Time
                    </p>
                    <p className="text-xl font-bold">
                      {lifecycle?.avgApprovalTimeHours.toFixed(1)} hours
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
