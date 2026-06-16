import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, rateLimit, handlePreflight } from "@/utils/api-bot/api-auth";
import { InitiateDonationSchema } from "@/utils/api-bot/schemas";
import { prisma } from "@/lib/prisma";
import Paystack from "@/services/paystack";
import { TransactionData } from "@/types";
import { logApiRequest } from "@/utils/api-bot/request-logger";
import { 
  successResponse, 
  errorResponse, 
  ApiErrorCode 
} from "@/utils/api-bot/response-utils";
import crypto from "crypto";



export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const limitRes = rateLimit(req);
    if (limitRes?.errorResponse) {
      await logApiRequest({ request: req, statusCode: 429, errorCode: ApiErrorCode.RATE_LIMIT_EXCEEDED, startedAt });
      return limitRes.errorResponse;
    }

    const auth = await validateApiKey(req);
    if (auth.errorResponse) {
      await logApiRequest({ request: req, statusCode: 401, errorCode: ApiErrorCode.UNAUTHORIZED, startedAt });
      return auth.errorResponse;
    }

    const body = await req.json();
    const parsed = InitiateDonationSchema.safeParse(body);
    if (!parsed.success) {
      const response = errorResponse("Validation failed", ApiErrorCode.VALIDATION_ERROR, 400, parsed.error.format());
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.VALIDATION_ERROR, startedAt });
      return response;
    }
    const data = parsed.data;

    let campaign;
    let campaignError;
    try {
      campaign = await prisma.api_campaigns.findFirst({
        where: { id: data.campaign_id },
        select: { id: true, sub_account_code: true, status: true, developer_id: true, mode: true, raised_amount: true }
      });
    } catch (err) {
      campaignError = err;
    }

    if (campaignError || !campaign) {
      const response = errorResponse("Campaign not found", ApiErrorCode.NOT_FOUND, 404);
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.NOT_FOUND, startedAt });
      return response;
    }

    if (campaign.developer_id !== auth.userId) {
      const response = errorResponse("Unauthorized access to campaign", ApiErrorCode.FORBIDDEN, 403);
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.FORBIDDEN, startedAt });
      return response;
    }

    // Enforce mode isolation: test keys can only donate to test campaigns
    if (campaign.mode !== auth.mode) {
      const response = errorResponse(
        `Mode mismatch: cannot use ${auth.mode} API key with a ${campaign.mode} campaign`, 
        ApiErrorCode.BAD_REQUEST, 400
      );
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.BAD_REQUEST, startedAt });
      return response;
    }

    if (campaign.status !== "active") {
      const response = errorResponse("Campaign is not active", ApiErrorCode.CAMPAIGN_NOT_ACTIVE, 400);
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.CAMPAIGN_NOT_ACTIVE, startedAt });
      return response;
    }

    // ── TEST MODE: Simulate donation without real payment ──
    if (auth.mode === "test") {
      const testReference = `test_ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

      let testDonation;
      let testDonErr;
      try {
        testDonation = await prisma.api_donations.create({
          data: {
            api_campaign_id: data.campaign_id,
            amount: data.amount,
            tip_amount: data.tip_amount || 0,
            donor_name: data.name,
            donor_email: data.email,
            message: data.message || "",
            is_anonymous: data.is_anonymous || false,
            status: "success",
            paystack_reference: testReference,
            mode: "test",
          }
        });
      } catch (err) {
        testDonErr = err;
      }

      if (testDonErr || !testDonation) {
        const response = errorResponse("Failed to create test donation", ApiErrorCode.INTERNAL_ERROR, 500);
        await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.INTERNAL_ERROR, startedAt });
        return response;
      }

      // Update campaign raised_amount
      try {
        const newRaised = Number(campaign.raised_amount || 0) + data.amount;
        await prisma.api_campaigns.update({
          where: { id: data.campaign_id },
          data: { raised_amount: newRaised }
        });
      } catch (err) {
        console.error("Failed to update campaign total", err);
      }

      // Dispatch webhook for test donation
      const { dispatchWebhook } = await import("@/utils/api-bot/webhook-utils");
      dispatchWebhook(auth.userId!, "donation.success", {
        id: testDonation.id,
        campaign_id: data.campaign_id,
        amount: data.amount,
        tip_amount: data.tip_amount || 0,
        donor_name: data.name,
        status: "success",
        reference: testReference,
        mode: "test",
      }).catch(console.error);

      const response = successResponse({
        reference: testReference,
        checkout_url: null,
        amount: data.amount,
        mode: "test",
        message: "Test donation processed instantly — no real payment was made.",
        donation_id: testDonation.id,
      }, 201);
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, startedAt });
      return response;
    }

    // ── LIVE MODE: Real Paystack transaction ──
    if (!campaign.sub_account_code) {
      const response = errorResponse("Campaign has no sub-account for payouts", ApiErrorCode.PAYMENT_SETUP_FAILED, 400);
      await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, errorCode: ApiErrorCode.PAYMENT_SETUP_FAILED, startedAt });
      return response;
    }

    // Platform fee exactly 2% of the amount
    const serviceFee = data.amount * 0.02;

    const transactionData: TransactionData = {
      id: auth.userId,
      amount: data.amount,
      serviceFee,
      tipAmount: data.tip_amount,
      causeId: data.campaign_id,
      email: data.email,
      full_name: data.name,
      message: data.message || "",
      isAnonymous: data.is_anonymous,
      callbackUrl: data.callback_url,
      subaccounts: [
        {
          subaccount: campaign.sub_account_code,
          share: data.amount,
        },
      ],
    };

    const paystackResponse = await Paystack.initializeTransaction(transactionData);

    const response = successResponse(paystackResponse);
    await logApiRequest({ request: req, statusCode: response.status, apiKeyId: auth.apiKeyId, userId: auth.userId, mode: auth.mode, startedAt });
    return response;
  } catch (error: any) {
    console.error("Donation initialization error:", error);
    const response = errorResponse(error.message || "Internal server error", ApiErrorCode.INTERNAL_ERROR, 500);
    await logApiRequest({ request: req, statusCode: response.status, errorCode: ApiErrorCode.INTERNAL_ERROR, startedAt });
    return response;
  }
}

export async function OPTIONS() {
  return handlePreflight();
}
