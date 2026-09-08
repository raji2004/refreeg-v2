jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { toast } from "@/components/ui/use-toast";
import { usePayment } from "@/hooks/use-payment";

const mockToast = toast as jest.Mock;

describe("usePayment", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns payment helpers and initial state", () => {
    const { result } = renderHook(() => usePayment());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.initializePayment).toBe("function");
    expect(typeof result.current.initializePledgeCheckout).toBe("function");
    expect(typeof result.current.verifyPayment).toBe("function");
  });

  it("initializes payment, stores reference, and calls payments API", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          reference: "ref-123",
          authorization_url: "https://paystack.com/pay/ref-123",
        },
      }),
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.initializePayment({
        amount: 5000,
        serviceFee: 100,
        causeId: "cause-1",
        message: "Thanks",
        isAnonymous: false,
        subaccounts: [],
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/payments/initialize",
      expect.objectContaining({ method: "POST" }),
    );
    expect(localStorage.getItem("payment_reference")).toBe("ref-123");
    expect(localStorage.getItem("payment_provider")).toBe("paystack");
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("initializes payment with flutterwave and stores provider", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          reference: "flw-123",
          authorization_url: "https://flutterwave.com/pay/flw-123",
        },
      }),
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.initializePayment({
        amount: 5000,
        serviceFee: 100,
        causeId: "cause-1",
        message: "Thanks",
        isAnonymous: false,
        subaccounts: [],
        paymentProvider: "flutterwave",
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/payments/initialize",
      expect.objectContaining({ method: "POST" }),
    );
    expect(localStorage.getItem("payment_reference")).toBe("flw-123");
    expect(localStorage.getItem("payment_provider")).toBe("flutterwave");
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("sets error and shows toast when payment initialization fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "Failed" }),
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await expect(
        result.current.initializePayment({
          amount: 5000,
          serviceFee: 100,
          causeId: "cause-1",
          message: "Thanks",
          isAnonymous: false,
          subaccounts: [],
        }),
      ).rejects.toThrow();
    });

    expect(result.current.error).toBe(
      "Failed to initialize payment. Please try again.",
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
  });

  it("verifies payment and clears stored reference when verified", async () => {
    localStorage.setItem("payment_reference", "ref-123");
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, verified: true }),
    });

    const { result } = renderHook(() => usePayment());

    let verified = false;
    await act(async () => {
      verified = await result.current.verifyPayment("ref-123");
    });

    expect(verified).toBe(true);
    expect(localStorage.getItem("payment_reference")).toBeNull();
  });

  it("verifies payment passing provider when provided", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, verified: true }),
    });

    const { result } = renderHook(() => usePayment());

    await act(async () => {
      await result.current.verifyPayment("flw-123", "flutterwave");
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/payments/verify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reference: "flw-123", provider: "flutterwave" }),
      }),
    );
  });
});
