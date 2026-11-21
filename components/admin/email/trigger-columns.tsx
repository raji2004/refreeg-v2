"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  features,
  type DataTableFeatures,
} from "@/components/ui/data-table-features";
import type { EmailTriggerItem } from "@/types/email-types";
import { Small, Span } from "@/components/marketing/Typography";

const columnHelper = createColumnHelper<DataTableFeatures, EmailTriggerItem>();

export const emailTriggerColumns = ({
  pendingKey,
  onToggle,
}: {
  pendingKey: string | null;
  onToggle: (key: string, enabled: boolean) => void;
}) =>
  columnHelper.columns([
    columnHelper.display({
      id: "event",
      header: "Event",
      cell: ({ row }) => (
        <span className="flex flex-col">
          <Span className="font-medium text-ink">{row.original.label}</Span>
          <Small>{row.original.audience}</Small>
        </span>
      ),
    }),
    columnHelper.display({
      id: "enabled",
      header: "Email",
      cell: ({ row }) =>
        row.original.required ? (
          <Badge variant="held">Required</Badge>
        ) : (
          <Switch
            checked={row.original.enabled}
            disabled={pendingKey === row.original.key}
            onCheckedChange={(checked) => onToggle(row.original.key, checked)}
            aria-label={`Send email for: ${row.original.label}`}
          />
        ),
    }),
  ]);
