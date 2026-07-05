jest.mock("@/actions/profile-actions", () => ({
  getProfile: jest.fn(),
}));

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { getProfile } from "@/actions/profile-actions";
import { useWallet } from "@/hooks/use-wallet";

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

describe("useWallet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns false and does not fetch when userId is undefined", () => {
    const { result } = renderHook(() => useWallet(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasWallet).toBe(false);
    expect(getProfile).not.toHaveBeenCalled();
  });

  it("returns true when profile has ethereum wallet", async () => {
    (getProfile as jest.Mock).mockResolvedValue({
      crypto_wallets: { ethereum: "0xabc123" },
    });

    const { result } = renderHook(() => useWallet("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getProfile).toHaveBeenCalledWith("user-1");
    expect(result.current.hasWallet).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("returns false when profile has no ethereum wallet", async () => {
    (getProfile as jest.Mock).mockResolvedValue({
      crypto_wallets: null,
    });

    const { result } = renderHook(() => useWallet("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasWallet).toBe(false);
  });
});
