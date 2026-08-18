import { ICreateSubaccount, TransactionData } from "@/types";
import axios from "axios";
import { getBaseURL } from "@/lib/utils";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.warn(
    "WARNING: No Paystack Secret Key found in environment variables. API calls will fail."
  );
}

const Paystack = {
  api: axios.create({
    baseURL: "https://api.paystack.co",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
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
      const totalCharge = data.amount + data.serviceFee + (data.providerFee || 0) + (data.tipAmount || 0);
      const feePlusTip = data.serviceFee + (data.tipAmount || 0);
      const primarySubaccount = data.subaccounts?.find(
        (entry) => entry?.subaccount?.trim().length,
      )?.subaccount;

      const requestData = {
        currency: "NGN",
        email: data.email,
        amount: Math.round(totalCharge * 100),
        callback_url: data.callbackUrl || `${baseUrl}/causes/${data.causeId}/payment/verify`,
        transaction_charge: Math.round(feePlusTip * 100),
        ...(primarySubaccount
          ? {
              subaccount: primarySubaccount,
              bearer: "account",
            }
          : {}),
        ...(data.plan ? { plan: data.plan } : {}),
        metadata: {
          amount: data.amount,
          tip_amount: data.tipAmount || 0,
          customer_name: data.full_name,
          cause_id: data.causeId,
          email: data.email,
          message: data.message,
          is_anonymous: data.isAnonymous,
          ...(data.referrer_code ? { ref_v1: data.referrer_code } : {}),
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

      const response = await this.api.post(
        "/transaction/initialize",
        requestData
      );

      return response.data.data as {
        authorization_url: string;
        reference: string;
        access_code: string;
      };
    } catch (error: any) {
      console.error("Paystack initialization error:", {
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
  verifyTransaction: async function (transactionReference: string) {
    const response = await this.api.get(
      `/transaction/verify/${transactionReference}`
    );
    return response.data.data.status === "success";
  },
  verifyTransactionFull: async function (transactionReference: string) {
    const response = await this.api.get(
      `/transaction/verify/${transactionReference}`
    );
    return response.data.data;
  },

  /**
   * Charge a saved card (authorization code) — used for scheduled pledge fulfillment.
   * @see https://paystack.com/docs/api/#transaction-charge-authorization
   */
  chargeAuthorization: async function (params: {
    authorizationCode: string;
    email: string;
    amountNgn: number;
    serviceFeeNgn: number;
    reference: string;
    causeId: string;
    subaccount?: string;
    metadata: Record<string, string | number | boolean | undefined>;
  }) {
    const totalKobo = Math.round(
      (params.amountNgn + params.serviceFeeNgn) * 100
    );
    const feeKobo = Math.round(params.serviceFeeNgn * 100);
    const primarySubaccount = params.subaccount?.trim();

    const body: Record<string, unknown> = {
      authorization_code: params.authorizationCode,
      email: params.email,
      amount: totalKobo,
      reference: params.reference,
      currency: "NGN",
      metadata: params.metadata,
    };

    if (primarySubaccount) {
      body.subaccount = primarySubaccount;
      body.bearer = "subaccount";
      body.transaction_charge = feeKobo;
    }

    const response = await this.api.post(
      "/transaction/charge_authorization",
      body
    );
    return response.data.data as {
      status?: string;
      reference?: string;
      gateway_response?: string;
    };
  },

  createSubaccount: async function (data: ICreateSubaccount) {
    const response = await this.api.post("/subaccount", {
      ...data,
      settlement_bank: data.bank_code,
    });

    return response.data.data as {
      subaccount_code: string;
      account_number: string;
    };
  },
  listBanks: async function () {
    try {
      const response = await this.api.get("/bank", {
        params: { country: "nigeria", perPage: 100 },
      });

      return response.data.data as {
        name: string;
        code: string;
      }[];
    } catch (error) {
      console.error("Error fetching banks:", error);
      return [];
    }
  },
  verifyAccountNumber: async function (
    accountNumber: string,
    bankCode: string
  ) {
    try {
      const response = await this.api.get("/bank/resolve", {
        params: { account_number: accountNumber, bank_code: bankCode },
      });

      return response.data.data as {
        account_name: string;
        bank_id: number;
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

export default Paystack;
