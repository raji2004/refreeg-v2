jest.mock("@/actions/signature-actions", () => ({
  createSignature: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { createSignature } from "@/actions/signature-actions";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { useSignature } from "@/hooks/use-signature";

const mockCreateSignature = createSignature as jest.Mock;
const mockToast = toast as jest.Mock;
const mockRefresh = jest.fn();

describe("useSignature", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ refresh: mockRefresh });
  });

  it("returns isLoading and createUserSignature", () => {
    const { result } = renderHook(() => useSignature());

    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.createUserSignature).toBe("function");
  });

  it("creates signature, shows success toast, and refreshes router", async () => {
    mockCreateSignature.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSignature());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.createUserSignature(
        "petition-1",
        "user-1",
        {
          amount: 0,
          name: "Jane",
          email: "jane@example.com",
          message: "Support",
          isAnonymous: false,
        },
      );
    });

    expect(success).toBe(true);
    expect(mockCreateSignature).toHaveBeenCalledWith(
      "petition-1",
      "user-1",
      expect.objectContaining({ name: "Jane" }),
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Thank you for your signature!" }),
    );
    expect(mockRefresh).toHaveBeenCalled();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("shows destructive toast when signature creation fails", async () => {
    mockCreateSignature.mockRejectedValue(new Error("Server error"));
    const { result } = renderHook(() => useSignature());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.createUserSignature(
        "petition-1",
        "user-1",
        {
          amount: 0,
          name: "Jane",
          email: "jane@example.com",
          message: "Support",
          isAnonymous: false,
        },
      );
    });

    expect(success).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Unable to process signature",
        variant: "destructive",
      }),
    );
  });
});
