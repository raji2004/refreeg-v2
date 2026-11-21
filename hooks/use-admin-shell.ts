"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminShellSummary } from "@/actions/admin/admin-shell-actions";

const ADMIN_SHELL_KEY = ["admin-shell-summary"];

export function useAdminShellSummary() {
  const query = useQuery({
    queryKey: ADMIN_SHELL_KEY,
    queryFn: getAdminShellSummary,
    staleTime: 60_000,
  });
  return {
    counts: query.data?.data?.counts ?? null,
    systemsNormal: query.data?.data?.systemsNormal ?? null,
  };
}

/** Call after a review decision so the sidebar badges catch up. */
export function useRefreshAdminShell() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ADMIN_SHELL_KEY });
}
