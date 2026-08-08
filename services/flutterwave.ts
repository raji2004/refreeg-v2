import { ICreateSubaccount, TransactionData } from "@/types";
import axios from "axios";
import { getBaseURL } from "@/lib/utils";

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

if (!FLUTTERWAVE_SECRET_KEY) {
  console.warn(
    "WARNING: No Flutterwave Secret Key found in environment variables. API calls will fail."
  );
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
      const primarySubaccount = data.subaccounts?.find(
        (entry) => entry?.subaccount?.trim().length,
      )?.subaccount;

      const requestData: Record<string, unknown> = {
        tx_ref: `flw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        amount: totalCharge,
        currency: "NGN",
        redirect_url: data.callbackUrl || `${baseUrl}/causes/${data.causeId}/payment/verify`,
        customer: {
          email: data.email,
          name: data.full_name || data.email,
        },
        customizations: {
          title: "RefreeG Donation",
          description: `Donation to cause ${data.causeId}`,
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
          ...(data.plan ? { plan: data.plan } : {}),
          ...(data.pledgeFlow
            ? {
                pledge_flow: data.pledgeFlow,
                pledge_id: data.pledgeId,
                future_pledge_amount: data.pledgeFutureAmount,
                reminder_date: data.reminderDate,
              }
            : {}),
        },
      };

      // Flutterwave split payments use subaccounts array
      if (primarySubaccount) {
        requestData.subaccounts = [
          {
            id: primarySubaccount,
            transaction_charge_type: "flat",
            transaction_charge: data.serviceFee + (data.tipAmount || 0),
          },
        ];
      }

      if (data.plan) {
        requestData.payment_plan = data.plan;
      }

      const response = await this.api.post("/payments", requestData);

      return {
        authorization_url: response.data.data.link,
        reference: requestData.tx_ref as string,
        access_code: response.data.data.link,
      };
    } catch (error: any) {
      console.error("Flutterwave initialization error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        data: error.response?.data?.message,
      });

      throw new Error(
        error.response?.data?.message ||
          "Failed to initialize payment transaction"
      );
    }
  },

  verifyTransaction: async function (transactionId: string) {
    const response = await this.api.get(
      `/transactions/${transactionId}/verify`
    );
    return response.data.data.status === "successful";
  },

  verifyTransactionFull: async function (transactionId: string) {
    const response = await this.api.get(
      `/transactions/${transactionId}/verify`
    );
    return response.data.data;
  },

  /**
   * Verify a transaction by its tx_ref (reference).
   * Flutterwave's primary verify endpoint uses the transaction ID,
   * but after redirect we only have tx_ref. This finds the transaction first.
   */
  verifyByReference: async function (txRef: string) {
    const response = await this.api.get(
      `/transactions/verify_by_reference?tx_ref=${txRef}`
    );
    return response.data.data.status === "successful";
  },

  verifyByReferenceFull: async function (txRef: string) {
    const response = await this.api.get(
      `/transactions/verify_by_reference?tx_ref=${txRef}`
    );
    return response.data.data;
  },

  createSubaccount: async function (data: ICreateSubaccount) {
    const response = await this.api.post("/subaccounts", {
      account_bank: data.bank_code,
      account_number: data.account_number,
      business_name: data.business_name,
      split_type: "percentage",
      split_value: 0, // RefreeG controls the fee via transaction_charge
      country: "NG",
    });

    return {
      subaccount_id: String(response.data.data.subaccount_id || response.data.data.id),
      account_number: data.account_number,
    };
  },

  listBanks: async function () {
    try {
      const response = await this.api.get("/banks/NG");

      return (response.data.data || []).map((bank: any) => ({
        name: bank.name,
        code: bank.code,
      })) as { name: string; code: string }[];
    } catch (error) {
      console.error("Error fetching banks from Flutterwave:", error);
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

      return {
        account_name: response.data.data.account_name,
        bank_id: 0, // Flutterwave doesn't return bank_id in resolve
      };
    } catch (error: any) {
      console.error(
        "Error verifying account on Flutterwave:",
        error.response?.data || error.message || error
      );

      throw new Error(
        error.response?.data?.message || "Failed to verify account number"
      );
    }
  },

  /**
   * Charge a saved card (token) — used for scheduled pledge fulfillment.
   * @see https://developer.flutterwave.com/docs/recurring-payments/tokenized-charges
   */
  chargeToken: async function (params: {
    token: string;
    email: string;
    amountNgn: number;
    serviceFeeNgn: number;
    reference: string;
    causeId: string;
    subaccount?: string;
    metadata: Record<string, string | number | boolean | undefined>;
  }) {
    const totalAmount = params.amountNgn + params.serviceFeeNgn;

    const body: Record<string, unknown> = {
      token: params.token,
      email: params.email,
      amount: totalAmount,
      tx_ref: params.reference,
      currency: "NGN",
      meta: params.metadata,
    };

    if (params.subaccount?.trim()) {
      body.subaccounts = [
        {
          id: params.subaccount,
          transaction_charge_type: "flat",
          transaction_charge: params.serviceFeeNgn,
        },
      ];
    }

    const response = await this.api.post("/tokenized-charges", body);
    return {
      status: response.data.data.status,
      reference: response.data.data.tx_ref,
      gateway_response: response.data.data.processor_response,
    };
  },
};

export default Flutterwave;
