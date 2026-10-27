import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  encodeStoreReviewDemoReference,
  isStoreReviewDemoAccount,
  isStoreReviewDemoEnabled,
  STORE_REVIEW_DEMO_REFERENCE_PREFIX,
} from "@/lib/auth/store-review-demo";
import Paystack from "@/services/paystack";
import { calculateServiceFee, calculateProviderFee } from "@/lib/utils";
import { assertCauseAcceptingDonations } from "@/lib/proof-milestones";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Verify authenticated user when Bearer token is present (required for Store Review Demo Mode)
    const authResult = await authenticateMobileRequest(request);
    const authUser = authResult.user;
    const isReviewerDemo = isStoreReviewDemoAccount(authUser?.email);

    // 1. Handle PIN / OTP / Phone submissions for ongoing charge
    if (data.action === "submit_pin") {
      if (!data.pin || !data.reference) {
        return apiError("Missing PIN or payment reference", 400);
      }
      if (
        isReviewerDemo &&
        String(data.reference).startsWith(STORE_REVIEW_DEMO_REFERENCE_PREFIX)
      ) {
        return apiSuccess({
          status: "success",
          reference: data.reference,
          isStoreReviewDemo: true,
        });
      }
      try {
        const res = await Paystack.submitPin(data.pin, data.reference);
        return apiSuccess(res);
      } catch (e: any) {
        return apiError(e.message || "Failed to submit PIN", 400);
      }
    }

    if (data.action === "submit_otp") {
      if (!data.otp || !data.reference) {
        return apiError("Missing OTP or payment reference", 400);
      }
      if (
        isReviewerDemo &&
        String(data.reference).startsWith(STORE_REVIEW_DEMO_REFERENCE_PREFIX)
      ) {
        return apiSuccess({
          status: "success",
          reference: data.reference,
          isStoreReviewDemo: true,
        });
      }
      try {
        const res = await Paystack.submitOtp(data.otp, data.reference);
        return apiSuccess(res);
      } catch (e: any) {
        return apiError(e.message || "Failed to submit OTP", 400);
      }
    }

    if (data.action === "submit_phone") {
      if (!data.phone || !data.reference) {
        return apiError("Missing phone or payment reference", 400);
      }
      if (
        isReviewerDemo &&
        String(data.reference).startsWith(STORE_REVIEW_DEMO_REFERENCE_PREFIX)
      ) {
        return apiSuccess({
          status: "success",
          reference: data.reference,
          isStoreReviewDemo: true,
        });
      }
      try {
        const res = await Paystack.submitPhone(data.phone, data.reference);
        return apiSuccess(res);
      } catch (e: any) {
        return apiError(e.message || "Failed to submit phone", 400);
      }
    }

    // 2. Initiate fresh direct charge (Bank Transfer, USSD, Card, OPay)
    if (!data.amount || !data.email || !data.causeId) {
      return apiError("Missing required fields (amount, email, causeId)", 400);
    }

    const numAmount = Number(data.amount);
    if (isNaN(numAmount) || numAmount < 100) {
      return apiError("Minimum donation amount is ₦100", 400);
    }

    try {
      await assertCauseAcceptingDonations(data.causeId);
    } catch (e: any) {
      return apiError(
        e.message || "This cause is not accepting donations currently",
        403,
      );
    }

    const serviceFee = calculateServiceFee(numAmount);
    const providerFee = calculateProviderFee(numAmount, "paystack");
    const tipAmount = Number(data.tipAmount || 0);
    const totalAmount = numAmount + serviceFee + providerFee + tipAmount;
    const totalKobo = Math.round(totalAmount * 100);
    const channel = data.channel || "bank_transfer";

    const effectiveDonorName = data.isAnonymous
      ? "Anonymous"
      : data.donorName || authUser?.fullName || "Supporter";

    // Strictly scoped Store Reviewer Demo Mode (Decision #7 / B10):
    // Only activates when STORE_REVIEW_DEMO_ENABLED="true" AND the authenticated JWT belongs
    // to STORE_REVIEW_DEMO_EMAIL (playreview@refreeg.com).
    if (isReviewerDemo && isStoreReviewDemoEnabled()) {
      const demoRef = encodeStoreReviewDemoReference({
        causeId: String(data.causeId),
        amount: numAmount,
        tipAmount,
        donorName: effectiveDonorName,
        email: authUser!.email,
        message: data.message || "",
        isAnonymous: Boolean(data.isAnonymous),
      });

      if (channel === "bank_transfer") {
        return apiSuccess({
          status: "send_address",
          reference: demoRef,
          display_text: `Store Review Demo: Transfer ₦${totalAmount.toLocaleString()} or tap "I Have Sent the Money" to complete verification.`,
          account_number: "9900004081",
          account_name: "RefreeG / Store Review Demo",
          bank_name: "Wema Bank (Demo)",
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          totalAmount,
          isStoreReviewDemo: true,
        });
      }

      if (channel === "ussd") {
        const bankCode = data.ussdBank || "737";
        return apiSuccess({
          status: "send_ussd",
          reference: demoRef,
          display_text: `Store Review Demo: Tap "I Have Dialed and Paid" to complete verification.`,
          ussd_code: `*${bankCode}*000*4081#`,
          totalAmount,
          isStoreReviewDemo: true,
        });
      }

      if (channel === "opay") {
        return apiSuccess({
          status: "pay_offline",
          reference: demoRef,
          display_text:
            "Store Review Demo: Tap 'I Have Approved in OPay' to complete verification.",
          totalAmount,
          isStoreReviewDemo: true,
        });
      }

      return apiSuccess({
        status: "success",
        reference: demoRef,
        display_text: "Store Review Demo payment approved.",
        totalAmount,
        isStoreReviewDemo: true,
      });
    }

    const metadata = {
      amount: numAmount,
      tip_amount: tipAmount,
      customer_name: effectiveDonorName,
      cause_id: data.causeId,
      email: data.email,
      message: data.message || "",
      is_anonymous: Boolean(data.isAnonymous),
      channel,
    };

    const chargePayload: Record<string, any> = {
      email: data.email,
      amount: totalKobo,
      metadata,
    };

    if (channel === "bank_transfer") {
      chargePayload.bank_transfer = {};
    } else if (channel === "ussd") {
      chargePayload.ussd = {
        type: data.ussdBank || "737",
      };
    } else if (channel === "card") {
      if (!data.card?.number || !data.card?.cvv) {
        return apiError("Missing card details (number, cvv, expiry)", 400);
      }
      chargePayload.card = {
        number: data.card.number.replace(/\s+/g, ""),
        cvv: data.card.cvv,
        expiry_month: data.card.expiry_month,
        expiry_year: data.card.expiry_year,
      };
      if (data.pin) chargePayload.pin = data.pin;
    } else if (channel === "opay") {
      chargePayload.mobile_money = {
        phone: data.phone || data.mobilePhone,
        provider: "opay",
      };
    }

    try {
      const chargeResponse = await Paystack.charge(chargePayload);
      return apiSuccess({
        status: chargeResponse.status,
        reference: chargeResponse.reference,
        display_text: chargeResponse.display_text,
        account_number: chargeResponse.account_number,
        account_name: chargeResponse.account_name,
        bank_name:
          chargeResponse.bank?.name || chargeResponse.bank || "Wema Bank",
        ussd_code: chargeResponse.ussd_code,
        expires_at: chargeResponse.expires_at,
        url: chargeResponse.url,
        totalAmount,
      });
    } catch (chargeErr: any) {
      console.warn("Paystack live charge call error:", chargeErr.message);

      // Only allow non-production local development fallback when NODE_ENV !== "production"
      if (process.env.NODE_ENV !== "production") {
        const mockRef = `ref_rg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        if (channel === "bank_transfer") {
          return apiSuccess({
            status: "send_address",
            reference: mockRef,
            display_text: `Please transfer ₦${totalAmount.toLocaleString()} to the dedicated account below.`,
            account_number:
              "99" + Math.floor(10000000 + Math.random() * 90000000),
            account_name: "RefreeG / Paystack Checkout",
            bank_name: "Wema Bank",
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            totalAmount,
            isMock: true,
          });
        }

        if (channel === "ussd") {
          const bankCode = data.ussdBank || "737";
          return apiSuccess({
            status: "send_ussd",
            reference: mockRef,
            display_text: `Dial *${bankCode}*000*${Math.floor(1000 + Math.random() * 9000)}# on your phone`,
            ussd_code: `*${bankCode}*000*${Math.floor(1000 + Math.random() * 9000)}#`,
            totalAmount,
            isMock: true,
          });
        }

        if (channel === "opay") {
          return apiSuccess({
            status: "pay_offline",
            reference: mockRef,
            display_text:
              "Please authorize the payment prompt sent to your OPay app.",
            totalAmount,
            isMock: true,
          });
        }

        if (channel === "card") {
          return apiSuccess({
            status: "send_otp",
            reference: mockRef,
            display_text: "An OTP was sent to your registered phone number.",
            totalAmount,
            isMock: true,
          });
        }
      }

      return apiError(chargeErr.message || "Failed to initiate payment", 400);
    }
  } catch (error: any) {
    console.error("Mobile API Charge Error:", error);
    return apiError("Internal server error", 500);
  }
}
