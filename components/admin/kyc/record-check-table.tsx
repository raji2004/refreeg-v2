"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import {
  features,
  type DataTableFeatures,
} from "@/components/ui/data-table-features";
import type { RecordCheckResult, RecordCheckRow } from "@/lib/didit";

const resultConfig: Record<
  RecordCheckResult,
  { label: string; variant: "verified" | "pending" | "critical" } | null
> = {
  match: { label: "Match", variant: "verified" },
  partial: { label: "Partial", variant: "pending" },
  differs: { label: "Differs", variant: "critical" },
  unknown: null,
};

const columnHelper = createColumnHelper<DataTableFeatures, RecordCheckRow>();

export function RecordCheckTable({ rows }: { rows: RecordCheckRow[] }) {
  const showOfficial = rows.some((row) => row.official);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("field", {
          header: "Field",
          cell: (info) => (
            <span className="text-sm text-ink/60">{info.getValue()}</span>
          ),
        }),
        columnHelper.accessor("submitted", {
          header: "Submitted",
          cell: (info) => (
            <span className="text-sm font-medium text-ink">
              {info.getValue() ?? "—"}
            </span>
          ),
        }),
        ...(showOfficial
          ? [
              columnHelper.accessor("official", {
                header: "Official record",
                cell: (info) => (
                  <span className="text-sm font-medium text-ink">
                    {info.getValue() ?? "—"}
                  </span>
                ),
              }),
              columnHelper.display({
                id: "result",
                header: "Result",
                cell: ({ row }) => {
                  const result = resultConfig[row.original.result];
                  return (
                    <span className="block text-right">
                      {result ? (
                        <Badge variant={result.variant}>{result.label}</Badge>
                      ) : (
                        <span className="text-xs text-ink/40">—</span>
                      )}
                    </span>
                  );
                },
              }),
            ]
          : []),
      ]),
    [showOfficial],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      className="rounded-lg border border-hairline"
    />
  );
}
