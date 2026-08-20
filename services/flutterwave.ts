import { ICreateSubaccount, TransactionData } from "@/types";
import axios from "axios";
import { getBaseURL } from "@/lib/utils";

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

if (!FLUTTERWAVE_SECRET_KEY) {
  console.warn(
    "WARNING: No Flutterwave Secret Key found in environment variables. API calls will fail.",
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
          "Missing required fields for transaction initialization",
        );
      }
      const baseUrl = await getBaseURL();
      const totalCharge =
        data.amount +
        data.serviceFee +
        (data.providerFee || 0) +
        (data.tipAmount || 0);
      const primarySubaccount = data.subaccounts?.find(
        (entry) => entry?.subaccount?.trim().length,
      )?.subaccount;

      const requestData: Record<string, unknown> = {
        tx_ref: `flw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        amount: totalCharge,
        currency: "NGN",
        redirect_url:
          data.callbackUrl ||
          `${baseUrl}/causes/${data.causeId}/payment/verify`,
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
          customer_name: data.full_name || "",
          cause_id: data.causeId,
          email: data.email,
          message: data.message || "",
          is_anonymous: String(data.isAnonymous),
          ...(data.referrer_code ? { ref_v1: data.referrer_code } : {}),
          ...(data.id ? { user_id: data.id } : {}),
          ...(data.plan ? { plan: data.plan } : {}),
          ...(data.pledgeFlow
            ? {
                pledge_flow: String(data.pledgeFlow),
                pledge_id: data.pledgeId || "",
                future_pledge_amount: data.pledgeFutureAmount || 0,
                reminder_date: data.reminderDate || "",
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

      let errorMessage =
        error.response?.data?.message ||
        "Failed to initialize payment transaction";
      if (
        error.response?.data?.errors &&
        Array.isArray(error.response.data.errors)
      ) {
        const details = error.response.data.errors
          .map((e: any) => e.message)
          .join(", ");
        errorMessage += `: ${details}`;
      }

      throw new Error(errorMessage);
    }
  },

  verifyTransaction: async function (transactionId: string) {
    const response = await this.api.get(
      `/transactions/${transactionId}/verify`,
    );
    return response.data.data.status === "successful";
  },

  verifyTransactionFull: async function (transactionId: string) {
    const response = await this.api.get(
      `/transactions/${transactionId}/verify`,
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
      `/transactions/verify_by_reference?tx_ref=${txRef}`,
    );
    return response.data.data.status === "successful";
  },

  verifyByReferenceFull: async function (txRef: string) {
    const response = await this.api.get(
      `/transactions/verify_by_reference?tx_ref=${txRef}`,
    );
    return response.data.data;
  },

  createSubaccount: async function (data: ICreateSubaccount) {
    const response = await this.api.post("/subaccounts", {
      account_bank: data.bank_code,
      account_number: data.account_number,
      business_name: data.business_name,
      business_email: data.business_email,
      business_contact_mobile: data.business_mobile || "08000000000",
      business_mobile: data.business_mobile || "08000000000",
      split_type: "percentage",
      split_value: 0, // RefreeG controls the fee via transaction_charge
      country: "NG",
    });

    return {
      subaccount_id: String(
        response.data.data.subaccount_id || response.data.data.id,
      ),
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

  getBankCode: async function (bankName: string) {
    const banks = await this.listBanks();
    const nameLower = bankName.toLowerCase();

    const exact = banks.find((b: any) => b.name.toLowerCase() === nameLower);
    if (exact) return exact.code;

    if (nameLower.includes("opay") || nameLower.includes("paycom")) {
      return (
        banks.find((b: any) => b.name.toLowerCase() === "opay")?.code ||
        "100004"
      );
    }
    if (nameLower.includes("moniepoint")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("moniepoint"))
          ?.code || "50515"
      );
    }
    if (nameLower.includes("kuda")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("kuda"))?.code ||
        "50211"
      );
    }
    if (nameLower.includes("palmpay")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("palmpay"))
          ?.code || "100033"
      );
    }
    if (nameLower.includes("first bank") || nameLower.includes("firstbank")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("first bank"))
          ?.code || "011"
      );
    }
    if (nameLower.includes("ecobank")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("ecobank"))
          ?.code || "050"
      );
    }
    if (nameLower.includes("union bank")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("union bank"))
          ?.code || "032"
      );
    }
    if (nameLower.includes("pocket") || nameLower.includes("teamapt")) {
      return (
        banks.find(
          (b: any) =>
            b.name.toLowerCase().includes("pocket") ||
            b.name.toLowerCase().includes("teamapt"),
        )?.code || "100005"
      );
    }
    if (nameLower.includes("sterling")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("sterling"))
          ?.code || "232"
      );
    }
    if (nameLower.includes("wema")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("wema"))?.code ||
        "035"
      );
    }
    if (nameLower.includes("zenith")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("zenith"))?.code ||
        "057"
      );
    }
    if (nameLower.includes("gtb") || nameLower.includes("guaranty")) {
      return (
        banks.find(
          (b: any) =>
            b.name.toLowerCase().includes("gtb") ||
            b.name.toLowerCase().includes("guaranty"),
        )?.code || "058"
      );
    }
    if (nameLower.includes("uba") || nameLower.includes("united bank")) {
      return (
        banks.find(
          (b: any) =>
            b.name.toLowerCase().includes("uba") ||
            b.name.toLowerCase().includes("united bank"),
        )?.code || "033"
      );
    }
    if (nameLower.includes("access")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("access"))?.code ||
        "044"
      );
    }
    if (nameLower.includes("fcmb")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("fcmb"))?.code ||
        "214"
      );
    }
    if (nameLower.includes("polaris")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("polaris"))
          ?.code || "076"
      );
    }
    if (nameLower.includes("fidelity")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("fidelity"))
          ?.code || "070"
      );
    }
    if (nameLower.includes("jaiz")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("jaiz"))?.code ||
        "301"
      );
    }
    if (nameLower.includes("keystone")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("keystone"))
          ?.code || "082"
      );
    }
    if (nameLower.includes("providus")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("providus"))
          ?.code || "101"
      );
    }
    if (nameLower.includes("stanbic")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("stanbic"))
          ?.code || "221"
      );
    }
    if (nameLower.includes("standard chartered")) {
      return (
        banks.find((b: any) =>
          b.name.toLowerCase().includes("standard chartered"),
        )?.code || "068"
      );
    }
    if (nameLower.includes("vfd")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("vfd"))?.code ||
        "566"
      );
    }
    if (
      nameLower.includes("9mobile") ||
      nameLower.includes("9 mobile") ||
      nameLower.includes("9psb")
    ) {
      return (
        banks.find(
          (b: any) =>
            b.name.toLowerCase().includes("9mobile") ||
            b.name.toLowerCase().includes("9psb"),
        )?.code || "120001"
      );
    }
    if (nameLower.includes("carbon") || nameLower.includes("one finance")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("carbon"))?.code ||
        "565"
      );
    }
    if (nameLower.includes("paga")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("paga"))?.code ||
        "100002"
      );
    }
    if (nameLower.includes("rubies")) {
      return (
        banks.find((b: any) => b.name.toLowerCase().includes("rubies"))?.code ||
        "125"
      );
    }

    const partial = banks.find(
      (b: any) =>
        b.name.toLowerCase().includes(nameLower) ||
        nameLower.includes(b.name.toLowerCase()),
    );

    return partial?.code || null;
  },

  /**
   * Find an existing Flutterwave subaccount by account number.
   * Used as a recovery path when "already exists" is returned during creation.
   * Paginates through all pages to ensure the subaccount is found.
   */
  findSubaccountByAccountNumber: async function (
    accountNumber: string,
  ): Promise<string | null> {
    try {
      let page = 1;
      const limit = 100;

      while (true) {
        const response = await this.api.get(
          `/subaccounts?limit=${limit}&page=${page}`,
        );
        const subaccounts: any[] = response.data.data || [];

        if (subaccounts.length === 0) break; // No more pages

        const match = subaccounts.find(
          (s: any) => s.account_number === accountNumber,
        );

        if (match) {
          return String(match.subaccount_id || match.id);
        }

        // If fewer results than the limit, we're on the last page
        if (subaccounts.length < limit) break;

        page++;
      }

      return null;
    } catch {
      return null;
    }
  },

  verifyAccountNumber: async function (
    accountNumber: string,
    bankCode: string,
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
        error.response?.data || error.message || error,
      );

      throw new Error(
        error.response?.data?.message || "Failed to verify account number",
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
