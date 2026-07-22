jest.mock("@/actions/profile-actions", () => ({
  hasBankDetails: jest.fn(),
}));

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { hasBankDetails } from "@/actions/profile-actions";
import { useBankDetails } from "@/hooks/use-bank-details";

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

describe("useBankDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null and does not fetch when userId is undefined", () => {
    const { result } = renderHook(() => useBankDetails(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.hasBankDetails).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(hasBankDetails).not.toHaveBeenCalled();
  });

  it("returns bank details when query succeeds", async () => {
    (hasBankDetails as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useBankDetails("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(hasBankDetails).toHaveBeenCalledWith("user-1");
    expect(result.current.hasBankDetails).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("returns error message when query fails", async () => {
    (hasBankDetails as jest.Mock).mockRejectedValue(new Error("fetch failed"));

    const { result } = renderHook(() => useBankDetails("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBe("fetch failed");
    });
  });
});
