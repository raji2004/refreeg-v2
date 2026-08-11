import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CircleCheck,
  Clock3,
  FileText,
  PencilLine,
  Plus,
  PauseCircle, // 👈 Added for Suspended state
} from "lucide-react";
import { getUserCausesWithStatus } from "@/actions/cause-actions";
import { CauseDropdown } from "./cause-dropdown";

interface MyCausesListProps {
  status: string;
  userId: string;
}

const formatNaira = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

// 👇 Updated to accept isPaused and return Amber/Yellow for suspended
const getStatusDetails = (status: string, isPaused: boolean) => {
  if (isPaused) {
    return {
      label: "Suspended",
      icon: PauseCircle,
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      accent: "bg-amber-500",
    };
  }

  switch (status) {
    case "approved":
      return {
        label: "Active",
        icon: CircleCheck,
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        accent: "bg-emerald-500",
      };
    case "pending":
      return {
        label: "Pending review",
        icon: Clock3,
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        accent: "bg-amber-400",
      };
    default:
      return {
        label: "Needs revision",
        icon: AlertCircle,
        badge: "border-rose-200 bg-rose-50 text-rose-700",
        accent: "bg-rose-500",
      };
  }
};

export async function MyCausesList({ status, userId }: MyCausesListProps) {
  const causes = await getUserCausesWithStatus(
    userId,
    status === "suspended" ? "approved" : status,
  );

  const filteredCauses =
    status === "all"
      ? causes
      : status === "suspended"
        ? causes.filter((cause) => cause.compliance_paused)
        : causes.filter(
            (cause) => cause.status === status && !cause.compliance_paused,
          );
  if (filteredCauses.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 px-5 py-14 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <FileText className="h-6 w-6" />
        </span>
        <h3 className="mt-5 text-xl font-semibold text-slate-950">
          No causes found
        </h3>
        {status === "all" ? (
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            You haven&apos;t created any causes yet.
          </p>
        ) : status === "approved" ? (
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            You don&apos;t have any active causes.
          </p>
        ) : status === "suspended" ? ( 
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            You don&apos;t have any suspended causes. Great job keeping your
            campaigns compliant!
          </p>
        ) : status === "pending" ? (
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            You don&apos;t have any causes pending approval.
          </p>
        ) : (
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            You don&apos;t have any rejected causes.
          </p>
        )}
        <Link href="/dashboard/causes/create" className="inline-block">
          <Button className="mt-6 h-11 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Create a new cause
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {filteredCauses.map((cause) => {
        const raised = Number(cause.raised) || 0;
        const goal = Number(cause.goal) || 0;
        const progress =
          goal > 0 ? Math.min(Math.max((raised / goal) * 100, 0), 100) : 0;

        // 👇 Pass compliance_paused to the status helper
        const statusDetails = getStatusDetails(
          cause.status,
          !!cause.compliance_paused,
        );
        const StatusIcon = statusDetails.icon;

        return (
          <Card
            key={cause.id}
            className="group relative overflow-hidden rounded-3xl border-slate-200/90 bg-white shadow-[0_14px_35px_-28px_rgba(15,23,42,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_22px_48px_-30px_rgba(37,99,235,0.35)]"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 ${statusDetails.accent}`}
            />
            <CardHeader className="pb-4 pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {cause.category && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                        {cause.category}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusDetails.badge}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusDetails.label}
                    </Badge>
                  </div>
                  <CardTitle
                    className="line-clamp-2 text-xl leading-7 text-slate-950"
                    title={cause.title}
                  >
                    {cause.title}
                  </CardTitle>
                  {cause.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                      {cause.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <CauseDropdown causeId={cause.id} causeSlug={cause.slug} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pb-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Amount raised
                    </p>
                    <p
                      className="mt-1 truncate text-xl font-bold tracking-tight text-slate-950"
                      title={formatNaira(raised)}
                    >
                      {formatNaira(raised)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-500">
                      Goal {formatNaira(goal)}
                    </p>
                    <p className="mt-1 text-sm font-bold text-blue-700">
                      {progress.toFixed(0)}%
                    </p>
                  </div>
                </div>
                <Progress
                  value={progress}
                  className="mt-3 h-2.5 bg-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    Created
                  </div>
                  <p className="mt-1.5 font-medium text-slate-800">
                    {formatDate(cause.created_at)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock3 className="h-4 w-4 text-slate-400" />
                    Updated
                  </div>
                  <p className="mt-1.5 font-medium text-slate-800">
                    {formatDate(cause.updated_at)}
                  </p>
                </div>
              </div>

              {cause.status === "rejected" && cause.rejection_reason && (
                <div className="flex gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-3.5 text-sm text-rose-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="min-w-0 leading-5">
                    <strong className="font-semibold">Review note:</strong>{" "}
                    {cause.rejection_reason}
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              {/* 👇 Updated Footer Logic for Paused State */}
              {cause.compliance_paused ? (
                <Badge
                  variant="outline"
                  className="flex h-11 w-full justify-center rounded-xl border-amber-200 bg-amber-50 text-sm font-medium text-amber-700"
                >
                  <PauseCircle className="mr-2 h-4 w-4" />
                  Campaign Suspended — Check banner above
                </Badge>
              ) : cause.status === "approved" ? (
                <Link
                  href={`/dashboard/causes/${cause.id}/analytics`}
                  className="w-full"
                >
                  <Button className="h-11 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View analytics
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </Link>
              ) : cause.status === "pending" ? (
                <Badge
                  variant="outline"
                  className="flex h-11 w-full justify-center rounded-xl border-amber-200 bg-amber-50 text-sm font-medium text-amber-700"
                >
                  <Clock3 className="mr-2 h-4 w-4" />
                  Awaiting approval
                </Badge>
              ) : (
                <Link
                  href={`/dashboard/causes/${cause.id}/edit`}
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-xl border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  >
                    <PencilLine className="mr-2 h-4 w-4" />
                    Revise and resubmit
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
