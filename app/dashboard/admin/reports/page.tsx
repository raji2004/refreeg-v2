import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Flag,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/actions/role-actions";
import {
  listModerationReports,
  resolveModerationReport,
  type ModerationAction,
} from "@/lib/moderation/moderation-service";
import { DATA_RETENTION_POLICY } from "@/lib/config/retention";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

async function handleModerationAction(formData: FormData) {
  "use server";

  const session = await auth();
  const adminId = session?.user?.id;
  if (!adminId) {
    redirect("/auth/signin");
  }

  const role = await getUserRole(adminId);
  if (role !== "admin" && role !== "manager") {
    throw new Error("Unauthorized");
  }

  const reportId = String(formData.get("reportId") || "").trim();
  const action = String(formData.get("action") || "dismiss").trim() as ModerationAction;

  if (!reportId) return;

  await resolveModerationReport({
    reportId,
    adminId,
    action,
  });

  revalidatePath("/dashboard/admin/reports");
}

export default async function AdminModerationReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }> | { status?: string };
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/auth/signin");
  }

  const userRole = await getUserRole(userId);
  if (!userRole || (userRole !== "admin" && userRole !== "manager")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to access the moderation queue.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const activeStatus =
    params.status && ["pending", "actioned", "dismissed"].includes(params.status)
      ? params.status
      : undefined;

  const { reports, counts } = await listModerationReports({
    status: activeStatus,
  });

  const tabs = [
    { label: "Pending", value: "pending", count: counts.pending },
    { label: "Actioned", value: "actioned", count: counts.actioned },
    { label: "Dismissed", value: "dismissed", count: counts.dismissed },
    {
      label: "All Reports",
      value: undefined,
      count: counts.pending + counts.actioned + counts.dismissed,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            UGC Moderation &amp; Content Reports
          </h1>
          <p className="text-muted-foreground">
            Review reported campaigns, petitions, comments, and user blocks
            within our {DATA_RETENTION_POLICY.MODERATION_SLA_HOURS}-hour
            moderation SLA.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
        >
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          Target SLA: {DATA_RETENTION_POLICY.MODERATION_SLA_HOURS} Hours
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-2xl">{counts.pending}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Awaiting moderator decision
          </CardContent>
        </Card>

        <Card className={counts.overdue > 0 ? "border-red-300 bg-red-50/40" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className={counts.overdue > 0 ? "text-red-700" : ""}>
              Overdue (&gt;{DATA_RETENTION_POLICY.MODERATION_SLA_HOURS}h)
            </CardDescription>
            <CardTitle
              className={`text-2xl ${counts.overdue > 0 ? "text-red-700" : ""}`}
            >
              {counts.overdue}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Requires immediate escalation
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actioned (Removed / Blocked)</CardDescription>
            <CardTitle className="text-2xl text-emerald-700">
              {counts.actioned}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Content removed or account blocked
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dismissed</CardDescription>
            <CardTitle className="text-2xl text-slate-700">
              {counts.dismissed}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Reviewed with no violation found
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-rose-600" />
                Moderation Queue
              </CardTitle>
              <CardDescription>
                Take one-click action to dismiss reports, remove offending
                content, or block abusive accounts.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isSelected = activeStatus === tab.value;
                const href = tab.value
                  ? `/dashboard/admin/reports?status=${tab.value}`
                  : "/dashboard/admin/reports";
                return (
                  <Link
                    key={tab.label}
                    href={href}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reported Account</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>SLA / Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No moderation reports found for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="max-w-[260px]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="uppercase">
                              {report.targetType}
                            </Badge>
                            <span className="font-mono text-xs text-muted-foreground">
                              {report.targetId.slice(0, 8)}...
                            </span>
                          </div>
                          {report.targetPreview ? (
                            <p className="line-clamp-2 text-xs text-slate-700">
                              &ldquo;{report.targetPreview}&rdquo;
                            </p>
                          ) : (
                            <p className="text-xs italic text-muted-foreground">
                              No preview available (or already deleted)
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[220px]">
                        <p className="font-medium text-slate-900">
                          {report.reason}
                        </p>
                        {report.details && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {report.details}
                          </p>
                        )}
                      </TableCell>

                      <TableCell>
                        {report.reportedUserId ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">
                              {report.reportedUserName || "User"}
                            </span>
                            {report.reportedUserEmail && (
                              <span className="text-xs text-muted-foreground">
                                {report.reportedUserEmail}
                              </span>
                            )}
                            {report.reportedUserBlocked && (
                              <Badge
                                variant="destructive"
                                className="mt-1 w-fit text-[10px]"
                              >
                                Blocked
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Unlinked
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {report.reporterName || "Guest / Mobile User"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(report.createdAt), "MMM d, HH:mm")}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {report.status === "pending" ? (
                          report.isOverdue ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Overdue ({Math.abs(report.hoursRemaining)}h)
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-amber-300 bg-amber-50 text-amber-800"
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              {report.hoursRemaining}h left
                            </Badge>
                          )
                        ) : report.status === "actioned" ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-300 bg-emerald-50 text-emerald-800"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Actioned
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Dismissed</Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {report.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <form action={handleModerationAction}>
                              <input
                                type="hidden"
                                name="reportId"
                                value={report.id}
                              />
                              <input
                                type="hidden"
                                name="action"
                                value="dismiss"
                              />
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                              >
                                Dismiss
                              </Button>
                            </form>

                            <form action={handleModerationAction}>
                              <input
                                type="hidden"
                                name="reportId"
                                value={report.id}
                              />
                              <input
                                type="hidden"
                                name="action"
                                value="remove_content"
                              />
                              <Button
                                type="submit"
                                size="sm"
                                variant="secondary"
                                className="h-8 gap-1 text-xs text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </Button>
                            </form>

                            {report.reportedUserId && (
                              <form action={handleModerationAction}>
                                <input
                                  type="hidden"
                                  name="reportId"
                                  value={report.id}
                                />
                                <input
                                  type="hidden"
                                  name="action"
                                  value="block_user"
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="destructive"
                                  className="h-8 gap-1 text-xs"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  Block User
                                </Button>
                              </form>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {report.resolutionNote || "Resolved"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

