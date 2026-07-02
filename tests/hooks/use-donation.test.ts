jest.mock("@/actions/donation-actions", () => ({
  createDonation: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import { renderHook, act } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { createDonation } from "@/actions/donation-actions";
import { toast } from "@/components/ui/use-toast";
import { useDonation } from "@/hooks/use-donation";

describe("useDonation", () => {
  const mockRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      refresh: mockRefresh,
    });
  });

  it("exposes isLoading and createDonation", () => {
    const { result } = renderHook(() => useDonation());

    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.createDonation).toBe("function");
  });

  it("creates donation successfully and refreshes router", async () => {
    (createDonation as jest.Mock).mockResolvedValue(undefined);
    const donationData = { amount: 100, isAnonymous: false } as never;

    const { result } = renderHook(() => useDonation());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.createDonation(
        "cause-1",
        "user-1",
        donationData,
      );
    });

    expect(success).toBe(true);
    expect(createDonation).toHaveBeenCalledWith(
      "cause-1",
      "user-1",
      donationData,
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Thank you for your donation!" }),
    );
    expect(mockRefresh).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("shows error toast and returns false on failure", async () => {
    (createDonation as jest.Mock).mockRejectedValue(new Error("payment failed"));

    const { result } = renderHook(() => useDonation());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.createDonation(
        "cause-1",
        null,
        {} as never,
      );
    });

    expect(success).toBe(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error processing donation",
        variant: "destructive",
      }),
    );
  });
});
