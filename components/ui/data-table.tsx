"use client";

import { useState } from "react";
import {
  useTable,
  type ColumnDef,
  type PaginationState,
  type RowData,
  type Updater,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  features,
  type DataTableFeatures,
} from "@/components/ui/data-table-features";
import { DataTablePagination } from "@/components/ui/data-table-pagination";

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  className?: string;
  pageSize?: number;
  pageIndex?: number;
  onPageIndexChange?: (pageIndex: number) => void;
  pagination?: boolean;
}

const headClassName =
  "text-xs uppercase tracking-[0.12em] text-ink/50 font-semibold";

export function DataTable<TData extends RowData>({
  columns,
  data,
  className,
  pageSize = 10,
  pageIndex,
  onPageIndexChange,
  pagination = false,
}: DataTableProps<TData>) {
  const [internalIndex, setInternalIndex] = useState(0);
  const controlled = onPageIndexChange !== undefined && pageIndex !== undefined;
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
  const index = Math.min(controlled ? pageIndex : internalIndex, pageCount - 1);

  const table = useTable({
    features,
    data,
    columns,
    state: { pagination: { pageIndex: index, pageSize } },
    onPaginationChange: (updater: Updater<PaginationState>) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: index, pageSize })
          : updater;
      if (controlled) onPageIndexChange(next.pageIndex);
      else setInternalIndex(next.pageIndex);
    },
  });

  return (
    <div className={className}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-b border-hairline hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className={headClassName}>
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="border-b border-hairline">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="border-b-0">
              <TableCell
                colSpan={columns.length}
                className="h-16 text-center text-sm text-ink/50"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {pagination && <DataTablePagination table={table} total={data.length} />}
    </div>
  );
}
