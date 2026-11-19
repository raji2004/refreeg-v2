"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Contact,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { KycStatusBadge } from "@/components/admin/kyc/kyc-status-badge";
import { FaceMatchMeter } from "@/components/admin/kyc/face-match-meter";
import {
  KYC_FACE_MATCH_THRESHOLD,
  kycIdTypeFilterOptions,
  kycStatusTabs,
} from "@/lib/options/kyc-review.options";
import { formatRelativeTime } from "@/lib/format-date";
import type { KycQueueItem, KycQueueTab } from "@/types/kyc-types";

/** Shape returned by getAdminKycQueueSnapshot(). */
type QueueSnapshot = {
  items: KycQueueItem[];
  counts: Record<KycQueueTab, number>;
  nextReviewUserId: string | null;
  error: string | null;
};

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

/**
 * The whole review board lives in client state: tabs, search, filters and
 * pagination re-render instantly with no navigation, matching the referrals
 * screens. Tab badges always show the full per-tab totals; the filters only
 * narrow the visible list, and say so when they hide everything.
 */
export function KycQueueClient({
  snapshot,
  initialTab,
}: {
  snapshot: QueueSnapshot;
  initialTab: KycQueueTab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<KycQueueTab>(initialTab);
  const [search, setSearch] = useState("");
  const [idType, setIdType] = useState("all");
  const [faceMatch, setFaceMatch] = useState("any");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const statuses =
      kycStatusTabs.find((item) => item.value === tab)?.statuses ?? [];
    return snapshot.items.filter((item) => {
      if (!statuses.includes(item.status)) return false;
      if (needle) {
        const haystack =
          `${item.name} ${item.email} ${item.idNumber ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (idType !== "all" && item.idType !== idType) return false;
      if (
        faceMatch === "below" &&
        (item.faceMatchScore == null ||
          item.faceMatchScore >= KYC_FACE_MATCH_THRESHOLD)
      ) {
        return false;
      }
      return true;
    });
  }, [snapshot.items, tab, search, idType, faceMatch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const offsetStart =
    filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const offsetEnd = Math.min(safePage * PAGE_SIZE, filtered.length);
  const filtersActive =
    search.trim() !== "" || idType !== "all" || faceMatch !== "any";

  const clearFilters = () => {
    setSearch("");
    setIdType("all");
    setFaceMatch("any");
    setPage(1);
  };

  const headClassName =
    "text-xs uppercase tracking-[0.12em] text-ink/50 font-semibold";

  return (
    <div className="space-y-6">
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
        {snapshot.nextReviewUserId && (
          <Button asChild variant="ink">
            <Link
              href={`/dashboard/admin/users/kyc/${snapshot.nextReviewUserId}?from=needs-review`}
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
          const count = snapshot.counts[item.value as KycQueueTab] ?? 0;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setTab(item.value as KycQueueTab);
                setPage(1);
              }}
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
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="relative"
            onSubmit={(event) => event.preventDefault()}
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email or ID number"
              className="w-64 bg-surface pl-9"
              aria-label="Search KYC submissions"
            />
          </form>
          <Select
            value={idType}
            onValueChange={(value) => {
              setIdType(value);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="w-44 bg-surface"
              aria-label="Filter by ID type"
            >
              <SelectValue placeholder="ID type" />
            </SelectTrigger>
            <SelectContent>
              {kycIdTypeFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={faceMatch}
            onValueChange={(value) => {
              setFaceMatch(value);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="w-56 bg-surface"
              aria-label="Filter by face match"
            >
              <SelectValue placeholder="Face match" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any face match</SelectItem>
              <SelectItem value="below">
                {`Face match below ${KYC_FACE_MATCH_THRESHOLD}%`}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-ink/50">Auto-checks by Didit</p>
      </div>

      <Card variant="surface" className="overflow-hidden py-0">
        <CardContent className="p-0">
          {snapshot.error ? (
            <EmptyState
              variant="page"
              className="py-16"
              icon={
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rust/15 text-rust">
                  <AlertTriangle className="h-7 w-7" />
                </span>
              }
              title="Identity checks are unavailable"
              description={`${snapshot.error} Submissions are saved and will be checked automatically when Didit is back.`}
              action={
                <Button
                  variant="ink"
                  size="sm"
                  onClick={() => router.refresh()}
                >
                  Try again
                </Button>
              }
            />
          ) : pageItems.length === 0 ? (
            filtersActive ? (
              <EmptyState
                variant="page"
                className="py-16"
                icon={
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-muted text-ink/70">
                    <Search className="h-7 w-7" />
                  </span>
                }
                title="No matches for these filters"
                description="The filters hid every submission in this tab. Adjust them, or clear them to see the full tab again."
                action={
                  <Button variant="ink" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
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
            )
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
                  {pageItems.map((item) => (
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
                  Showing {offsetStart}–{offsetEnd} of {filtered.length}
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Previous page"
                      disabled={safePage <= 1}
                      onClick={() => setPage(safePage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-1 text-xs text-ink/50">
                      Page {safePage} of {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Next page"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage(safePage + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
