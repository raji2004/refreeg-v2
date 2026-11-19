"use client";

import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KycStatusBadge } from "@/components/admin/kyc/kyc-status-badge";
import { FaceMatchMeter } from "@/components/admin/kyc/face-match-meter";
import { initials } from "@/lib/kyc-review";
import { formatRelativeTime } from "@/lib/format-date";
import {
  features,
  type DataTableFeatures,
} from "@/components/ui/data-table-features";
import type { KycQueueItem, KycQueueTab } from "@/types/kyc-types";

const columnHelper = createColumnHelper<DataTableFeatures, KycQueueItem>();

export const kycQueueColumns = (tab: KycQueueTab) =>
  columnHelper.columns([
    columnHelper.display({
      id: "person",
      header: "Person",
      cell: ({ row }) => (
        <Link
          href={`/dashboard/admin/users/kyc/${row.original.userId}?from=${tab}`}
          className="flex items-center gap-3"
          aria-label={`Review ${row.original.name}`}
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-cream-muted text-xs font-semibold text-ink">
              {initials(row.original.name)}
            </AvatarFallback>
          </Avatar>
          <span className="flex flex-col">
            <span className="font-medium text-ink">{row.original.name}</span>
            <span className="text-xs text-ink/50">
              {row.original.email || "No email on file"}
            </span>
          </span>
        </Link>
      ),
    }),
    columnHelper.accessor("idLabel", {
      header: "ID",
      cell: (info) => (
        <span className="text-sm text-ink/70">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("submittedAt", {
      header: "Submitted",
      cell: ({ row }) => (
        <span className="text-sm text-ink/70">
          {formatRelativeTime(row.original.submittedAt)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "faceMatch",
      header: "Face match",
      cell: ({ row }) => (
        <FaceMatchMeter score={row.original.faceMatchScore} compact />
      ),
    }),
    columnHelper.display({
      id: "checks",
      header: "Checks",
      cell: ({ row }) => (
        <span className="text-sm text-ink/70">
          {row.original.checksPassed != null && row.original.checksTotal != null
            ? `${row.original.checksPassed} of ${row.original.checksTotal}`
            : "—"}
        </span>
      ),
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: ({ row }) => <KycStatusBadge status={row.original.status} />,
    }),
  ]);
