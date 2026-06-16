"use client";

import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/actions/profile-actions";

export function useWallet(userId: string | undefined) {
  const {
    data: hasWallet,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["wallet", userId],
    queryFn: async () => {
      if (!userId) return false;
      const profile = await getProfile(userId);
      const wallets = profile?.crypto_wallets as { ethereum?: string } | null;
      return !!wallets?.ethereum;
    },
    enabled: !!userId,
  });

  return {
    hasWallet: hasWallet ?? false,
    isLoading,
    error: error instanceof Error ? error.message : (error as string | null),
  };
}
