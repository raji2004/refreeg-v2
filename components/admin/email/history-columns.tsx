"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  features,
  type DataTableFeatures,
} from "@/components/ui/data-table-features";
import { emailAudienceOptions } from "@/lib/options/email-audience.options";
import type { AnnouncementItem, AnnouncementStatus } from "@/types/email-types";
import { Span } from "@/components/marketing/Typography";

const columnHelper = createColumnHelper<DataTableFeatures, AnnouncementItem>();

const statusVariant: Record<AnnouncementStatus, BadgeProps["variant"]> = {
  scheduled: "pending",
  sending: "blue",
  sent: "forest",
  failed: "critical",
};

const formatWhen = (value: string) =>
  new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const announcementColumns = columnHelper.columns([
  columnHelper.accessor("title", {
    header: "Announcement",
    cell: (info) => (
      <Span className="font-medium text-ink">{info.getValue()}</Span>
    ),
  }),
  columnHelper.display({
    id: "audience",
    header: "Audience",
    cell: ({ row }) => (
      <Span className="text-sm text-ink/70">
        {emailAudienceOptions.find((o) => o.value === row.original.audience)
          ?.label ?? row.original.audience}
      </Span>
    ),
  }),
  columnHelper.display({
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]}>
        {row.original.status}
      </Badge>
    ),
  }),
  columnHelper.display({
    id: "when",
    header: "When",
    cell: ({ row }) => (
      <Span className="text-sm text-ink/70">
        {formatWhen(row.original.completedAt ?? row.original.scheduledAt)}
      </Span>
    ),
  }),
  columnHelper.display({
    id: "delivery",
    header: "Delivered",
    cell: ({ row }) => (
      <Span className="text-sm text-ink/70">
        {row.original.sentCount.toLocaleString()} of{" "}
        {row.original.recipientCount.toLocaleString()}
        {row.original.failedCount > 0 &&
          ` · ${row.original.failedCount.toLocaleString()} failed`}
      </Span>
    ),
  }),
]);
