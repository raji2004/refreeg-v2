import {
  columnVisibilityFeature,
  createPaginatedRowModel,
  rowPaginationFeature,
  tableFeatures,
} from "@tanstack/react-table";

export const features = tableFeatures({
  rowPaginationFeature,
  columnVisibilityFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

export type DataTableFeatures = typeof features;
