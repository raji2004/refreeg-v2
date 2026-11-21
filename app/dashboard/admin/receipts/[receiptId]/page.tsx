import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getUserRole } from "@/actions/admin/role-actions";
import {
  getAdminReceiptDetail,
  getAdminReceiptQueue,
} from "@/actions/admin/admin-receipt-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ReceiptPreview } from "@/components/admin/receipts/ReceiptPreview";
import { ReceiptFieldTable } from "@/components/admin/receipts/ReceiptFieldTable";
import { ReceiptMilestoneCard } from "@/components/admin/receipts/ReceiptMilestoneCard";
import { ReceiptStatusCallout } from "@/components/admin/receipts/ReceiptStatusCallout";
import { VerifyReceiptButton } from "@/components/admin/receipts/VerifyReceiptButton";
import { AskForInfoDialog } from "@/components/admin/receipts/AskForInfoDialog";
import { RejectReceiptDialog } from "@/components/admin/receipts/RejectReceiptDialog";
import {
  buildReceiptFieldRows,
  formatNaira,
  receiptLabel,
  receiptMatch,
  toAmount,
} from "@/lib/receipts/receipt-check";
import { receiptQueueTabOptions } from "@/lib/options/receipt-review.options";
import { formatRelativeTime } from "@/lib/format-date";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import type { ReceiptMedia } from "@/types/receipt-types";

const fieldReasons: Record<string, string> = {
  Amount: "Amount doesn't match the receipt",
  Vendor: "Vendor doesn't match the receipt",
  Date: "Date doesn't match the receipt",
  "Invoice no.": "Invoice number is missing",
};

function PagerLink({
  receiptId,
  tab,
  label,
}: {
  receiptId: string | undefined;
  tab: string;
  label: string;
}) {
  if (!receiptId) {
    return (
      <Button variant="surface" size="sm" disabled>
        {label}
      </Button>
    );
  }
  return (
    <Button asChild variant="surface" size="sm">
      <Link href={`/dashboard/admin/receipts/${receiptId}?from=${tab}`}>
        {label === "Next" && <ArrowRight className="mr-1 h-4 w-4" />}
        {label}
      </Link>
    </Button>
  );
}

export default async function ReceiptReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ receiptId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { receiptId } = await params;
  const { from } = (await searchParams) ?? {};

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");
  const role = await getUserRole(userId);
  if (role !== "admin" && role !== "manager") redirect("/dashboard");

  const tabOption =
    receiptQueueTabOptions.find((option) => option.value === from) ??
    receiptQueueTabOptions[0];
  const tab = tabOption.value;
  const queueHref = `/dashboard/admin/receipts?tab=${tab}`;

  const [detail, queue] = await Promise.all([
    getAdminReceiptDetail(receiptId),
    getAdminReceiptQueue(),
  ]);
  const receipt = detail.receipt;
  if (!receipt) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16">
        <EmptyState
          variant="page"
          title="Receipt not found"
          description={detail.error}
          action={
            <Button asChild variant="ink" size="sm">
              <Link href={queueHref}>Back to receipts</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const label = receiptLabel(receipt.receipt_no);
  const rows = buildReceiptFieldRows(receipt);
  const match = receiptMatch(rows);
  const claimed = toAmount(receipt.amount);
  const read = toAmount(receipt.read_amount);
  const amountDiffers =
    rows.find((row) => row.field === "Amount")?.result === "differs";
  const differingRows = rows.filter((row) => row.result === "differs");
  const creatorName = receipt.user.fullName || "the creator";
  const isOpen = receipt.status === "pending" || receipt.status === "need_info";

  const tabIds = queue.items
    .filter((item) => item.tab === tab)
    .map((item) => item.id);
  const index = tabIds.indexOf(receipt.id);
  const nextId = index >= 0 ? tabIds[index + 1] : tabIds[0];
  const prevId = index > 0 ? tabIds[index - 1] : undefined;

  const media = (
    Array.isArray(receipt.media) ? (receipt.media as ReceiptMedia[]) : []
  ).map((item) => {
    const url = getMediaUrl(item.url);
    return { ...item, url, unoptimized: isProxyMediaUrl(url) };
  });

  const firstDiff = differingRows[0];
  const suggestedMessage = amountDiffers
    ? `Your receipt${receipt.vendor ? ` from ${receipt.vendor}` : ""} shows ${formatNaira(read ?? 0)}, but ${formatNaira(claimed ?? 0)} was entered. Please correct the amount or upload the full invoice.`
    : firstDiff
      ? `The ${firstDiff.field.toLowerCase()} on your receipt reads ${firstDiff.onReceipt}, but you entered ${firstDiff.entered}. Please correct it or upload a clearer receipt.`
      : "";

  const position = detail.milestoneReceiptIds.indexOf(receipt.id) + 1;
  const milestoneRows = [
    { term: "Campaign", value: receipt.cause.title },
    {
      term: "Milestone",
      value: receipt.milestone
        ? `${receipt.milestone}% raised`
        : "General proof",
    },
    {
      term: "Budgeted",
      value: receipt.milestone
        ? formatNaira(Number(receipt.cause.goal) * 0.25)
        : "—",
    },
    {
      term: "Receipts so far",
      value:
        position > 0
          ? `${position} of ${detail.milestoneReceiptIds.length}`
          : "—",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <nav className="flex items-center gap-2 text-xs text-ink/50">
            <Link href={queueHref} className="hover:text-ink">
              Receipts
            </Link>
            <span className="text-ink/30">→</span>
            <span>{tabOption.label}</span>
          </nav>
          <h1 className="font-fraunces text-3xl tracking-tight text-ink">
            {label} · {receipt.receipt_title || "Fund-use proof"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <PagerLink receiptId={prevId} tab={tab} label="Previous" />
          <PagerLink receiptId={nextId} tab={tab} label="Next" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <ReceiptPreview media={media} label={label} />
          <Card variant="surface">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm">How the funds were used</CardTitle>
              <CardDescription>
                {creatorName} · {formatRelativeTime(receipt.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink/70">
                {receipt.description}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card variant="surface">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm">Read from receipt</CardTitle>
              {match === "match" && (
                <Badge variant="verified">All fields match</Badge>
              )}
              {match === "mismatch" && (
                <Badge variant="critical">
                  {differingRows.length === 1
                    ? "1 field differs"
                    : `${differingRows.length} fields differ`}
                </Badge>
              )}
              {match === "manual" && (
                <Badge variant="pending">Check by eye</Badge>
              )}
            </CardHeader>
            <CardContent>
              <ReceiptFieldTable rows={rows} />
            </CardContent>
          </Card>

          <ReceiptMilestoneCard rows={milestoneRows} />

          <ReceiptStatusCallout
            status={receipt.status}
            rows={rows}
            claimed={claimed}
            read={read}
            verifiedAmount={toAmount(receipt.verified_amount)}
            rejectionReason={receipt.rejection_reason}
            infoReason={receipt.info_request_reason}
            infoMessage={receipt.info_request_message}
            infoReplyBy={receipt.info_reply_by}
          />

          {isOpen ? (
            <div className="space-y-3">
              <VerifyReceiptButton
                receiptId={receipt.id}
                receiptLabel={label}
                amount={amountDiffers ? read : (claimed ?? read)}
                atReceiptAmount={amountDiffers}
                returnTab={tab}
              />
              <div className="flex flex-wrap gap-2">
                {receipt.status === "pending" && (
                  <AskForInfoDialog
                    receiptId={receipt.id}
                    receiptLabel={label}
                    creatorName={creatorName}
                    suggestedReason={
                      firstDiff ? (fieldReasons[firstDiff.field] ?? "") : ""
                    }
                    suggestedMessage={suggestedMessage}
                  />
                )}
                <RejectReceiptDialog
                  receiptId={receipt.id}
                  receiptLabel={label}
                  creatorName={creatorName}
                  returnTab={tab}
                />
              </div>
            </div>
          ) : (
            <Button asChild variant="surface" size="sm">
              <Link href={queueHref}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to {tabOption.label}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
