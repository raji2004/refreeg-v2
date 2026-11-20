"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Contact, Search } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DataTable } from "@/components/ui/data-table";
import { kycQueueColumns } from "@/app/dashboard/admin/users/kyc/columns";
import { kycTabStatuses } from "@/lib/kyc-review";
import {
  KYC_FACE_MATCH_THRESHOLD,
  kycIdTypeFilterOptions,
  kycStatusTabs,
} from "@/lib/options/kyc-review.options";
import type { AdminKycQueueSnapshot, KycQueueTab } from "@/types/kyc-types";

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

export function KycQueueClient({
  snapshot,
  initialTab,
}: {
  snapshot: AdminKycQueueSnapshot;
  initialTab: KycQueueTab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<KycQueueTab>(initialTab);
  const [search, setSearch] = useState("");
  const [idType, setIdType] = useState("all");
  const [faceMatch, setFaceMatch] = useState("any");
  const [pageIndex, setPageIndex] = useState(0);

  const columns = useMemo(() => kycQueueColumns(tab), [tab]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const statuses = kycTabStatuses[tab];
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

  const filtersActive =
    search.trim() !== "" || idType !== "all" || faceMatch !== "any";

  const clearFilters = () => {
    setSearch("");
    setIdType("all");
    setFaceMatch("any");
    setPageIndex(0);
  };

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
                setPageIndex(0);
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
                setPageIndex(0);
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
              setPageIndex(0);
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
              setPageIndex(0);
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
          ) : filtered.length === 0 ? (
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
            <DataTable
              columns={columns}
              data={filtered}
              pageSize={PAGE_SIZE}
              pageIndex={pageIndex}
              onPageIndexChange={setPageIndex}
              pagination
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
