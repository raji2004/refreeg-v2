"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  receiptAmountFilterOptions,
  receiptQueueTabOptions,
} from "@/lib/options/receipt-review.options";
import { cn } from "@/lib/utils";
import type { ReceiptQueueItem, ReceiptQueueTab } from "@/types/receipt-types";
import { ReceiptQueueTable } from "./ReceiptQueueTable";

const PAGE_SIZE = 8;

type QueueSnapshot = {
  items: ReceiptQueueItem[];
  counts: Record<ReceiptQueueTab, number>;
  nextReceiptId: string | null;
  error: string | null;
};

const emptyCopy: Record<
  ReceiptQueueTab,
  { title: string; description: string }
> = {
  "to-verify": {
    title: "All receipts verified",
    description:
      "There's nothing waiting. New uploads from creators land here.",
  },
  mismatch: {
    title: "No mismatches",
    description:
      "Receipts whose details differ from what the creator entered show up here.",
  },
  "need-info": {
    title: "No open info requests",
    description:
      "Receipts you send back to a creator wait here until they reply.",
  },
  verified: {
    title: "Nothing verified yet",
    description:
      "Verified receipts appear here with the amount they were verified at.",
  },
};

const inAmountRange = (amount: number | null, range: string) => {
  if (range === "all") return true;
  if (amount == null) return false;
  const [min, max] = range.split("-");
  return amount >= Number(min || 0) && (max === "" || amount < Number(max));
};

/** Receipt review board: tabs, search, filters and paging are client state so switching is instant, like KYC. */
export function ReceiptQueueClient({
  snapshot,
  initialTab,
}: {
  snapshot: QueueSnapshot;
  initialTab: ReceiptQueueTab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ReceiptQueueTab>(initialTab);
  const [filters, setFilters] = useState({
    search: "",
    campaign: "all",
    amount: "all",
  });
  const [page, setPage] = useState(1);

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const campaigns = useMemo(
    () => [...new Set(snapshot.items.map((item) => item.causeTitle))].sort(),
    [snapshot.items],
  );

  const filtered = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    return snapshot.items.filter(
      (item) =>
        item.tab === tab &&
        (!needle ||
          `${item.label} ${item.title} ${item.causeTitle}`
            .toLowerCase()
            .includes(needle)) &&
        (filters.campaign === "all" || item.causeTitle === filters.campaign) &&
        inAmountRange(item.claimed, filters.amount),
    );
  }, [snapshot.items, tab, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const filtersActive =
    filters.search.trim() !== "" ||
    filters.campaign !== "all" ||
    filters.amount !== "all";
  const needInfoCount = snapshot.counts["need-info"];

  const emptyState = snapshot.error
    ? {
        icon: <AlertTriangle className="h-7 w-7 text-rust" />,
        title: "Receipts are unavailable",
        description: snapshot.error,
        action: (
          <Button variant="ink" size="sm" onClick={() => router.refresh()}>
            Try again
          </Button>
        ),
      }
    : filtersActive
      ? {
          icon: <Search className="h-7 w-7" />,
          title: "No matches for these filters",
          description:
            "The filters hid every receipt in this tab. Clear them to see the full tab.",
          action: (
            <Button
              variant="ink"
              size="sm"
              onClick={() =>
                setFilters({ search: "", campaign: "all", amount: "all" })
              }
            >
              Clear filters
            </Button>
          ),
        }
      : {
          icon: <Receipt className="h-7 w-7" />,
          title: emptyCopy[tab].title,
          description:
            tab === "to-verify" && needInfoCount > 0
              ? `There's nothing waiting. ${needInfoCount} creator${needInfoCount === 1 ? " still owes" : "s still owe"} you more information; you'll see their replies under Need info.`
              : emptyCopy[tab].description,
          action:
            tab === "to-verify" && needInfoCount > 0 ? (
              <Button
                variant="surface"
                size="sm"
                onClick={() => setTab("need-info")}
              >
                Open Need info
              </Button>
            ) : undefined,
        };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-fraunces text-3xl tracking-tight text-ink">
            Receipt verification
          </h1>
          <p className="text-sm text-ink/60">
            Receipts uploaded by creators against milestones. Funds are released
            only when receipts are verified.
          </p>
        </div>
        {snapshot.nextReceiptId && (
          <Button asChild variant="ink">
            <Link
              href={`/dashboard/admin/receipts/${snapshot.nextReceiptId}?from=${tab}`}
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Start next receipt
            </Link>
          </Button>
        )}
      </div>

      <nav
        className="flex w-fit flex-wrap items-center gap-1 rounded-full bg-bone p-1"
        aria-label="Receipt queue tabs"
      >
        {receiptQueueTabOptions.map((option) => {
          const isActive = option.value === tab;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setTab(option.value);
                setPage(1);
              }}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink/60 hover:text-ink",
              )}
            >
              {option.label}
              {option.value !== "verified" && (
                <span className="rounded-full bg-cream-muted px-1.5 text-xs text-ink/60">
                  {snapshot.counts[option.value]}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <Input
            value={filters.search}
            onChange={(event) => setFilter("search", event.target.value)}
            placeholder="Search receipt ID or campaign"
            className="w-64 bg-surface pl-9"
            aria-label="Search receipts"
          />
        </div>
        <Select
          value={filters.campaign}
          onValueChange={(value) => setFilter("campaign", value)}
        >
          <SelectTrigger
            className="w-48 bg-surface"
            aria-label="Filter by campaign"
          >
            <SelectValue placeholder="Campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {campaigns.map((title) => (
              <SelectItem key={title} value={title}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.amount}
          onValueChange={(value) => setFilter("amount", value)}
        >
          <SelectTrigger
            className="w-44 bg-surface"
            aria-label="Filter by amount"
          >
            <SelectValue placeholder="Amount" />
          </SelectTrigger>
          <SelectContent>
            {receiptAmountFilterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card variant="surface" className="overflow-hidden py-0">
        <CardContent className="p-0">
          {pageItems.length === 0 ? (
            <EmptyState variant="page" className="py-16" {...emptyState} />
          ) : (
            <ReceiptQueueTable
              items={pageItems}
              tab={tab}
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
