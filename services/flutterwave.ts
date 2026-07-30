import { TransactionData } from "@/types";
import axios from "axios";
import { getBaseURL } from "@/lib/utils";

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

if (!FLUTTERWAVE_SECRET_KEY) {
  console.warn(
    "WARNING: No Flutterwave Secret Key found in environment variables. API calls will fail."
  );
}

export interface ICreateFlutterwaveSubaccount {
  account_bank: string;
  account_number: string;
  business_name: string;
  business_email?: string;
  business_contact?: string;
  business_contact_mobile?: string;
  business_mobile?: string;
  country: string;
  split_type: "percentage" | "flat";
  split_value: number;
}

const Flutterwave = {
  api: axios.create({
    baseURL: "https://api.flutterwave.com/v3",
    headers: {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  }),

  initializeTransaction: async function (data: TransactionData) {
    try {
      if (!data.amount) {
        throw new Error(
          "Missing required fields for transaction initialization"
        );
      }
      const baseUrl = await getBaseURL();
      const totalCharge = data.amount + data.serviceFee + (data.tipAmount || 0);
      const tx_ref = `tx-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

      const requestData: any = {
        tx_ref,
        amount: totalCharge, // Flutterwave takes major units, not minor
        currency: data.currency || "NGN",
        redirect_url: data.callbackUrl || `${baseUrl}/causes/${data.causeId}/payment/verify?provider=flutterwave`,
        customer: {
          email: data.email,
          name: data.full_name || "Guest Donor",
        },
        meta: {
          amount: data.amount,
          tip_amount: data.tipAmount || 0,
          customer_name: data.full_name,
          cause_id: data.causeId,
          email: data.email,
          message: data.message,
          is_anonymous: data.isAnonymous,
          ...(data.id ? { user_id: data.id } : {}),
        },
        customizations: {
          title: "Refreeg Donation",
          description: `Donation to cause ${data.causeId}`,
        },
      };

      if (data.flutterwaveSubaccountId) {
        requestData.subaccounts = [
          {
            id: data.flutterwaveSubaccountId
          }
        ];
      }

      const response = await this.api.post("/payments", requestData);

      return response.data.data as {
        link: string;
        tx_ref: string;
      };
    } catch (error: any) {
      console.error("Flutterwave initialization error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      throw new Error(
        error.response?.data?.message ||
          "Failed to initialize payment transaction"
      );
    }
  },

  verifyTransaction: async function (transactionId: string) {
    try {
      const response = await this.api.get(`/transactions/${transactionId}/verify`);
      return response.data.data.status === "successful";
    } catch (error) {
      return false;
    }
  },

  verifyTransactionFull: async function (transactionId: string) {
    const response = await this.api.get(`/transactions/${transactionId}/verify`);
    return response.data.data;
  },

  createSubaccount: async function (data: ICreateFlutterwaveSubaccount) {
    const response = await this.api.post("/subaccounts", data);

    return response.data.data as {
      subaccount_id: string;
      account_number: string;
    };
  },

  listBanks: async function (country: string = "NG") {
    try {
      const response = await this.api.get(`/banks/${country}`);

      return response.data.data as {
        name: string;
        code: string;
      }[];
    } catch (error) {
      console.error("Error fetching Flutterwave banks:", error);
      return [];
    }
  },

  verifyAccountNumber: async function (
    accountNumber: string,
    bankCode: string
  ) {
    try {
      const response = await this.api.post("/accounts/resolve", {
        account_number: accountNumber,
        account_bank: bankCode,
      });

      return response.data.data as {
        account_name: string;
      };
    } catch (error: any) {
      console.error(
        "Error verifying account:",
        error.response?.data || error.message || error
      );

      throw new Error(
        error.response?.data?.message || "Failed to verify account number"
      );
    }
  },
};

export default Flutterwave;
