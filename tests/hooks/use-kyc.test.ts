jest.mock("@/actions/profile-actions", () => ({
  hasKycVerification: jest.fn(),
  updateKycStatus: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { hasKycVerification, updateKycStatus } from "@/actions/profile-actions";
import { toast } from "@/components/ui/use-toast";
import { useKyc } from "@/hooks/use-kyc";

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

const mockKyc = {
  id: "kyc-1",
  user_id: "user-1",
  document_type: "passport",
  document_url: "https://example.com/doc.pdf",
  status: "approved" as const,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("useKyc", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not fetch when userId is undefined", () => {
    const { result } = renderHook(() => useKyc(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.kycVerification).toBeUndefined();
    expect(hasKycVerification).not.toHaveBeenCalled();
  });

  it("returns kyc data and isVerified when approved", async () => {
    (hasKycVerification as jest.Mock).mockResolvedValue(mockKyc);

    const { result } = renderHook(() => useKyc("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.kycVerification).toEqual(mockKyc);
    expect(result.current.isVerified).toBe(true);
  });

  it("updates kyc status via mutation", async () => {
    (hasKycVerification as jest.Mock).mockResolvedValue(mockKyc);
    (updateKycStatus as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useKyc("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.kycVerification).toEqual(mockKyc);
    });

    act(() => {
      result.current.updateKycStatus({
        verificationId: "kyc-1",
        status: "rejected",
        notes: "Invalid document",
      });
    });

    await waitFor(() => {
      expect(updateKycStatus).toHaveBeenCalledWith(
        "kyc-1",
        "rejected",
        "Invalid document",
      );
    });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "KYC status updated" }),
    );
  });
});
