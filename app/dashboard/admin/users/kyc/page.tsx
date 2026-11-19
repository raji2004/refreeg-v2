import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Contact } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/actions/admin/role-actions";
import { getAdminKycQueue } from "@/actions/users/kyc-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PaginationButton } from "@/components/engagement/PaginationButton";
import { KycStatusBadge } from "@/components/admin/kyc/kyc-status-badge";
import { FaceMatchMeter } from "@/components/admin/kyc/face-match-meter";
import { KycQueueFilters } from "@/components/admin/kyc/kyc-queue-filters";
import { KycFlashToast } from "@/components/admin/kyc/kyc-flash-toast";
import {
  KYC_FACE_MATCH_THRESHOLD,
  kycStatusTabs,
} from "@/lib/options/kyc-review.options";
import { formatRelativeTime } from "@/lib/format-date";
import type { KycQueueTab } from "@/types/kyc-types";

const PAGE_SIZE = 8;

const emptyStateCopy: Record<
  KycQueueTab,
  { title: string; description: string }
> = {
  "needs-review": {
    title: "No identity checks waiting",
    description:
      "Everyone who submitted ID has a decision. Large withdrawals that need KYC will appear here too.",
  },
  resubmitted: {
    title: "No resubmission requests open",
    description:
      "Applicants you asked to redo a check will wait here until Didit reports a new result.",
  },
  approved: {
    title: "Nothing approved yet",
    description:
      "Approved identities will appear here with their check results.",
  },
  rejected: {
    title: "Nothing rejected",
    description:
      "Rejected verifications will appear here with the reason recorded.",
  },
};

function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default async function KycListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
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
            You do not have permission to access this page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const params = (await searchParams) ?? {};
  const firstParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const tabParam = firstParam(params.tab);
  const tab = (
    kycStatusTabs.some((item) => item.value === tabParam)
      ? tabParam
      : "needs-review"
  ) as KycQueueTab;
  const search = firstParam(params.search);
  const idType = firstParam(params.idType);
  const faceMatch = firstParam(params.faceMatch);
  const page = Number.parseInt(firstParam(params.page) ?? "1", 10) || 1;

  const queue = await getAdminKycQueue({
    tab,
    search,
    idType,
    faceMatchBelow:
      faceMatch === "below" ? KYC_FACE_MATCH_THRESHOLD : undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(queue.total / PAGE_SIZE));
  const offsetStart = (page - 1) * PAGE_SIZE;
  const offsetEnd = Math.min(offsetStart + PAGE_SIZE, queue.total);

  const tabHref = (value: string) => {
    const next = new URLSearchParams();
    if (value !== "needs-review") next.set("tab", value);
    if (search) next.set("search", search);
    if (idType && idType !== "all") next.set("idType", idType);
    if (faceMatch && faceMatch !== "any") next.set("faceMatch", faceMatch);
    const queryString = next.toString();
    return queryString
      ? `/dashboard/admin/users/kyc?${queryString}`
      : "/dashboard/admin/users/kyc";
  };

  const headClassName =
    "text-xs uppercase tracking-[0.12em] text-ink/50 font-semibold";

  return (
    <div className="space-y-6 px-4 py-4 md:px-0 md:py-6">
      <KycFlashToast />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Eyebrow>KYC reviews</Eyebrow>
          <h1 className="font-fraunces text-3xl tracking-tight text-ink">
            KYC verification
          </h1>
          <p className="text-sm text-ink/60">
            Identity checks for creators, organisations and large withdrawals.
          </p>
        </div>
        {queue.nextReviewUserId && (
          <Button asChild variant="ink">
            <Link
              href={`/dashboard/admin/users/kyc/${queue.nextReviewUserId}?from=needs-review`}
            >
              Start next check
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <nav
        className="flex w-fit items-center gap-1 rounded-full bg-bone p-1"
        aria-label="KYC queue tabs"
      >
        {kycStatusTabs.map((item) => {
          const isActive = item.value === tab;
          const count = queue.counts[item.value as KycQueueTab];
          return (
            <Link
              key={item.value}
              href={tabHref(item.value)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              {item.label}
              <span
                className={`text-xs ${isActive ? "text-ink/50" : "text-ink/40"}`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <KycQueueFilters
          search={search}
          idType={idType}
          faceMatch={faceMatch}
        />
        <p className="text-xs text-ink/50">Auto-checks by Didit</p>
      </div>

      <Card variant="surface" className="overflow-hidden py-0">
        <CardContent className="p-0">
          {queue.error ? (
            <EmptyState
              variant="page"
              className="py-16"
              icon={
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rust/15 text-rust">
                  <AlertTriangle className="h-7 w-7" />
                </span>
              }
              title="Identity checks are unavailable"
              description={`${queue.error} Submissions are saved and will be checked automatically when Didit is back.`}
              action={
                <Button asChild variant="ink" size="sm">
                  <Link href={tabHref(tab)}>Try again</Link>
                </Button>
              }
            />
          ) : queue.items.length === 0 ? (
            <EmptyState
              variant="page"
              className="py-16"
              icon={
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-muted text-ink/70">
                  <Contact className="h-7 w-7" />
                </span>
              }
              title={emptyStateCopy[tab].title}
              description={emptyStateCopy[tab].description}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-hairline hover:bg-transparent">
                    <TableHead className={headClassName}>Person</TableHead>
                    <TableHead className={headClassName}>ID</TableHead>
                    <TableHead className={headClassName}>Submitted</TableHead>
                    <TableHead className={headClassName}>Face match</TableHead>
                    <TableHead className={headClassName}>Checks</TableHead>
                    <TableHead className={headClassName}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="border-b border-hairline"
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/admin/users/kyc/${item.userId}?from=${tab}`}
                          className="flex items-center gap-3"
                          aria-label={`Review ${item.name}`}
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-cream-muted text-xs font-semibold text-ink">
                              {initials(item.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="flex flex-col">
                            <span className="font-medium text-ink">
                              {item.name}
                            </span>
                            <span className="text-xs text-ink/50">
                              {item.email || "No email on file"}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-ink/70">
                        {item.idLabel}
                      </TableCell>
                      <TableCell className="text-sm text-ink/70">
                        {formatRelativeTime(item.submittedAt)}
                      </TableCell>
                      <TableCell>
                        <FaceMatchMeter score={item.faceMatchScore} compact />
                      </TableCell>
                      <TableCell className="text-sm text-ink/70">
                        {item.checksPassed != null && item.checksTotal != null
                          ? `${item.checksPassed} of ${item.checksTotal}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <KycStatusBadge status={item.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
                <p className="text-xs text-ink/50">
                  Showing {offsetStart + 1}–{offsetEnd} of {queue.total}
                </p>
                {totalPages > 1 && (
                  <PaginationButton
                    currentPage={page}
                    totalPages={totalPages}
                  />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
