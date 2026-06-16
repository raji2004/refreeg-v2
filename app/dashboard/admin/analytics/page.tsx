import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Search,
  Satellite,
  Layers3,
  KeyRound,
  Globe,
  FlaskConical,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getApiCampaigns } from "@/actions/admin-analytics-actions";
import { getUserRole } from "@/lib/auth/admin-auth";
import { auth } from "@/lib/auth/auth";

const AdminAnalytics = dynamic(
  () => import("@/components/admin/AdminAnalytics"),
  {
    loading: () => (
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
    ),
  },
);

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }> | { search?: string };
}) {
  const params = await searchParams;
  const search = params?.search?.trim() || "";

  const session = await auth();

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

  const { campaigns, stats } = await getApiCampaigns(search);

  const totalCauses = stats.total;
  const uniqueApis = stats.uniqueApis;
  const liveCauses = stats.liveCount;
  const testCauses = stats.testCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Analytics</h1>
          <p className="text-muted-foreground">
            Monitor platform performance and API metrics.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/admin/api-monitoring">
              Detailed API Reports
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Total API causes
                </p>
                <p className="text-2xl font-semibold">{totalCauses}</p>
              </div>
              <Layers3 className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unique APIs</p>
                <p className="text-2xl font-semibold">{uniqueApis}</p>
              </div>
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Live mode causes
                </p>
                <p className="text-2xl font-semibold">{liveCauses}</p>
              </div>
              <Globe className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Test mode causes
                </p>
                <p className="text-2xl font-semibold">{testCauses}</p>
              </div>
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Satellite className="h-4 w-4" />
                </div>
                <CardTitle>Recent API Causes</CardTitle>
              </div>
              <Badge variant="secondary">{campaigns.length} shown</Badge>
            </div>
            <CardDescription>
              List of recent campaigns created via API keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <form className="relative w-full md:w-96" method="GET">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Search API, key prefix, mode, or cause..."
                  className="pl-8"
                  defaultValue={search}
                />
              </form>
              {search && (
                <Badge variant="outline" className="w-fit">
                  Filter: {search}
                </Badge>
              )}
            </div>

            {campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No API causes found{search ? ` for "${search}"` : ""}.
              </p>
            ) : (
              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>API</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Cause</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-semibold">
                              API
                            </span>
                            <span>{campaign.apiName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {campaign.apiPrefix}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {campaign.apiMode}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate">
                          {campaign.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <AdminAnalytics />
      </div>
    </div>
  );
}
