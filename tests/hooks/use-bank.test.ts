jest.mock("@/actions/profile-actions", () => ({
  updateBankDetails: jest.fn(),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import { updateBankDetails } from "@/actions/profile-actions";
import { toast } from "@/components/ui/use-toast";
import { useBank } from "@/hooks/use-bank";

const mockUpdateBankDetails = updateBankDetails as jest.Mock;
const mockToast = toast as jest.Mock;

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
};

const mockBanksResponse = {
  success: true,
  data: [
    { name: "Test Bank", code: "058" },
    { name: "Other Bank", code: "011" },
  ],
};

describe("useBank", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => mockBanksResponse,
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns bank form state and handlers", async () => {
    const { result } = renderHook(
      () =>
        useBank({
          userId: "user-123",
          initialData: {
            account_number: "0000000000",
            bank_name: "Access Bank",
            account_name: "John Doe",
            sub_account_code: "SUB_123",
            flutterwave_sub_account_id: "FLW_SUB_456",
          },
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoadingBanks).toBe(false));

    expect(mockUpdateBankDetails).not.toHaveBeenCalled(); // We just initialized the hook
    expect(result.current.banks).toHaveLength(2);
    expect(typeof result.current.handleBankChange).toBe("function");
    expect(typeof result.current.handleBankSubmit).toBe("function");
  });

  it("updates form data when handleBankChange is called", async () => {
    const { result } = renderHook(
      () => useBank({ userId: "user-1" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoadingBanks).toBe(false));

    act(() => {
      result.current.handleBankChange("0123456789", "accountNumber");
    });

    expect(result.current.formData.accountNumber).toBe("0123456789");
    expect(result.current.formData.accountName).toBe("");
  });

  it("submits bank details and updates profile cache on success", async () => {
    const updatedProfile = {
      account_number: "0123456789",
      bank_name: "Test Bank",
      account_name: "Jane Doe",
      sub_account_code: "SUB_NEW",
    };
    mockUpdateBankDetails.mockResolvedValue(updatedProfile);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: async () => mockBanksResponse })
      .mockResolvedValueOnce({
        json: async () => ({
        success: true,
        data: {
          subaccount_code: "SUB_123",
          flutterwave_sub_account_id: "FLW_SUB_456",
        },
      }),
      });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    const { result } = renderHook(
      () =>
        useBank({
          userId: "user-1",
          initialData: {
            account_number: "",
            bank_name: "",
            account_name: "",
            sub_account_code: "",
          },
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoadingBanks).toBe(false));

    act(() => {
      result.current.handleBankChange("Test Bank", "bankName");
      result.current.handleBankChange("0123456789", "accountNumber");
      result.current.handleBankChange("Jane Doe", "accountName");
    });

    await act(async () => {
      await result.current.handleBankSubmit({
        preventDefault: jest.fn(),
      } as unknown as React.FormEvent);
    });

    expect(mockUpdateBankDetails).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        accountNumber: "0123456789",
        bankName: "Test Bank",
        sub_account_code: "SUB_123",
        flutterwave_sub_account_id: "FLW_SUB_456",
      }),
    );
    expect(client.getQueryData(["profile", "user-1"])).toEqual(updatedProfile);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Success" }),
    );
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
  });
});
