"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAnnouncements,
  getAudienceReach,
  getEmailTriggers,
  setEmailTrigger,
} from "@/actions/admin/email-actions";

const POLL_MS = 10_000;

export function useEmailTriggers() {
  const query = useQuery({
    queryKey: ["email-triggers"],
    queryFn: getEmailTriggers,
  });
  const result = query.data;
  return {
    triggers: result?.success ? result.data : [],
    error: (result && !result.success && result.error) || query.error?.message,
    isLoading: query.isLoading,
  };
}

type TriggersResult = Awaited<ReturnType<typeof getEmailTriggers>>;

// The switch flips at once and goes back if the server refuses or fails.
export function useSetEmailTrigger() {
  const queryClient = useQueryClient();
  const queryKey = ["email-triggers"];
  const restore = (previous?: TriggersResult) =>
    previous && queryClient.setQueryData(queryKey, previous);

  return useMutation({
    mutationFn: (input: { key: string; enabled: boolean }) =>
      setEmailTrigger(input.key, input.enabled),
    onMutate: async ({ key, enabled }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TriggersResult>(queryKey);
      queryClient.setQueryData<TriggersResult>(queryKey, (current) =>
        current?.success
          ? {
              ...current,
              data: current.data.map((t) =>
                t.key === key ? { ...t, enabled } : t,
              ),
            }
          : current,
      );
      return { previous };
    },
    onSuccess: (result, _input, context) => {
      if (!result.success) restore(context?.previous);
    },
    onError: (_error, _input, context) => restore(context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useAudienceReach(audience: string) {
  const query = useQuery({
    queryKey: ["email-reach", audience],
    queryFn: () => getAudienceReach(audience),
    enabled: !!audience,
    staleTime: 30_000,
  });
  const result = query.data;
  return {
    count: result?.success ? result.data.count : null,
    error: (result && !result.success && result.error) || query.error?.message,
    isLoading: query.isLoading,
  };
}

// Poll while something is still going out so the History counts move.
export function useAnnouncements() {
  const query = useQuery({
    queryKey: ["email-announcements"],
    queryFn: getAnnouncements,
    refetchInterval: (q) => {
      const result = q.state.data;
      const active =
        result?.success &&
        result.data.some(
          (a) => a.status === "scheduled" || a.status === "sending",
        );
      return active ? POLL_MS : false;
    },
  });
  const result = query.data;
  return {
    announcements: result?.success ? result.data : [],
    error: (result && !result.success && result.error) || query.error?.message,
    isLoading: query.isLoading,
  };
}
