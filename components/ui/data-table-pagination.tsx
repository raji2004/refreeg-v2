"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactTable, RowData } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  features,
  type DataTableFeatures,
} from "@/components/ui/data-table-features";

interface DataTablePaginationProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
  total: number;
}

export function DataTablePagination<TData extends RowData>({
  table,
  total,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = table.getPageCount();
  if (total === 0) return null;
  const offsetStart = pageIndex * pageSize + 1;
  const offsetEnd = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
      <p className="text-xs text-ink/50">
        Showing {offsetStart}–{offsetEnd} of {total}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-1 text-xs text-ink/50">
            Page {pageIndex + 1} of {pageCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
