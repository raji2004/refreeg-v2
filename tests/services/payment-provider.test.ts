import { getProvider, initializeTransaction, createDualSubaccounts } from "@/services/payment-provider";
import Paystack from "@/services/paystack";
import Flutterwave from "@/services/flutterwave";
import { TransactionData } from "@/types";

jest.mock("@/services/paystack", () => ({
  initializeTransaction: jest.fn(),
  createSubaccount: jest.fn(),
}));

jest.mock("@/services/flutterwave", () => ({
  initializeTransaction: jest.fn(),
  createSubaccount: jest.fn(),
}));

describe("Payment Provider Dispatcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProvider", () => {
    it("should return Flutterwave when provider is flutterwave", () => {
      expect(getProvider("flutterwave")).toBe(Flutterwave);
    });

    it("should return Paystack when provider is paystack", () => {
      expect(getProvider("paystack")).toBe(Paystack);
    });

    it("should default to Paystack when provider is undefined or invalid", () => {
      expect(getProvider(undefined)).toBe(Paystack);
      expect(getProvider("invalid_provider" as any)).toBe(Paystack);
    });
  });

  describe("initializeTransaction", () => {
    it("should dispatch to Flutterwave", async () => {
      const data: TransactionData = {
        amount: 1000,
        serviceFee: 15,
        causeId: "c1",
        message: "",
        isAnonymous: false,
        subaccounts: [],
      };
      await initializeTransaction(data, "flutterwave");
      expect(Flutterwave.initializeTransaction).toHaveBeenCalledWith(data);
      expect(Paystack.initializeTransaction).not.toHaveBeenCalled();
    });

    it("should dispatch to Paystack", async () => {
      const data: TransactionData = {
        amount: 1000,
        serviceFee: 15,
        causeId: "c1",
        message: "",
        isAnonymous: false,
        subaccounts: [],
      };
      await initializeTransaction(data, "paystack");
      expect(Paystack.initializeTransaction).toHaveBeenCalledWith(data);
      expect(Flutterwave.initializeTransaction).not.toHaveBeenCalled();
    });
  });

  describe("createDualSubaccounts", () => {
    it("should call both providers and return both codes", async () => {
      (Paystack.createSubaccount as jest.Mock).mockResolvedValueOnce({
        subaccount_code: "SUB_123",
        account_number: "0000000000",
      });
      (Flutterwave.createSubaccount as jest.Mock).mockResolvedValueOnce({
        subaccount_id: "RS_456",
        account_number: "0000000000",
      });

      const data = {
        account_number: "0000000000",
        bank_code: "044",
        business_name: "Test",
        percentage_charge: 0,
      };

      const result = await createDualSubaccounts(data);
      expect(Paystack.createSubaccount).toHaveBeenCalledWith(data);
      expect(Flutterwave.createSubaccount).toHaveBeenCalledWith(data);
      expect(result).toEqual({
        paystack: { subaccount_code: "SUB_123", account_number: "0000000000" },
        flutterwave: { subaccount_id: "RS_456", account_number: "0000000000" },
      });
    });
  });
});
