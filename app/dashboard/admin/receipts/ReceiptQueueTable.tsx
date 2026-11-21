import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReceiptMatchBadge } from "@/components/admin/receipts/ReceiptMatchBadge";
import { formatNaira } from "@/lib/receipts/receipt-check";
import { formatRelativeTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type {
  ReceiptMatch,
  ReceiptQueueItem,
  ReceiptQueueTab,
} from "@/types/receipt-types";

const headClassName =
  "text-xs uppercase tracking-[0.12em] text-ink/50 font-semibold";

const avatarTone: Record<ReceiptMatch, string> = {
  match: "bg-verified-soft text-forest",
  mismatch: "bg-rust/10 text-rust",
  manual: "bg-gold/30 text-ink",
};

export function ReceiptQueueTable({
  items,
  tab,
  page,
  pageSize,
  total,
  onPageChange,
}: {
  items: ReceiptQueueItem[];
  tab: ReceiptQueueTab;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstShown = (page - 1) * pageSize + 1;
  const lastShown = Math.min(page * pageSize, total);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline hover:bg-transparent">
            <TableHead className={headClassName}>Receipt</TableHead>
            <TableHead className={headClassName}>Campaign</TableHead>
            <TableHead className={headClassName}>Claimed</TableHead>
            <TableHead className={headClassName}>Read from receipt</TableHead>
            <TableHead className={headClassName}>Match</TableHead>
            <TableHead className={headClassName}>Waiting</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="border-b border-hairline">
              <TableCell>
                <Link
                  href={`/dashboard/admin/receipts/${item.id}?from=${tab}`}
                  className="flex items-center gap-3"
                  aria-label={`Review ${item.label}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className={cn(
                        "text-xs font-semibold",
                        avatarTone[item.match],
                      )}
                    >
                      R
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex flex-col">
                    <span className="font-semibold text-ink">{item.label}</span>
                    <span className="text-xs text-ink/50">{item.title}</span>
                  </span>
                </Link>
              </TableCell>
              <TableCell className="text-sm text-ink/70">
                {item.causeTitle}
              </TableCell>
              <TableCell className="text-sm font-semibold text-ink">
                {item.claimed == null ? "—" : formatNaira(item.claimed)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-sm",
                  item.readAmount == null
                    ? "text-ink/40"
                    : item.match === "mismatch"
                      ? "font-semibold text-rust"
                      : "font-semibold text-ink",
                )}
              >
                {item.readAmount == null
                  ? "Unreadable"
                  : formatNaira(item.readAmount)}
              </TableCell>
              <TableCell>
                <ReceiptMatchBadge match={item.match} />
              </TableCell>
              <TableCell className="text-sm font-semibold text-ink">
                {formatRelativeTime(item.submittedAt).replace(" ago", "")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
        <p className="text-xs text-ink/50">
          Showing {firstShown}–{lastShown} of {total}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="surface"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="surface"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
