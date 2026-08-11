/**
 * Provider-agnostic pledge processing.
 *
 * Wraps the original pledge-paystack logic so both Paystack and Flutterwave
 * webhooks can call the same functions, just passing a provider name.
 */
import { createDonation } from "@/actions/donation-actions";
import { prisma } from "@/lib/prisma";
import { verifyTransactionFull } from "@/services/payment-provider";
import { sendPledgeConfirmationEmail } from "@/services/mail";
import { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/pledge-constants";
import { calculateServiceFee } from "@/lib/utils";
import type { PaymentProviderType } from "@/types";

export { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/pledge-constants";

export async function processPledgeAuthorizationSuccess(
  reference: string,
  provider: PaymentProviderType = "paystack",
) {
  const full = (await verifyTransactionFull(reference, provider)) as {
    status?: string;
    metadata?: Record<string, string | number | boolean | undefined>;
    meta?: Record<string, string | number | boolean | undefined>;
    authorization?: {
      authorization_code?: string;
      reusable?: boolean;
    };
    // Flutterwave uses card.token for tokenized charges
    card?: { token?: string };
    customer?: { email?: string };
  };

  const isSuccess =
    provider === "flutterwave"
      ? full.status === "successful"
      : full.status === "success";

  if (!isSuccess) {
    return { ok: false as const, reason: "not_success" };
  }

  // Flutterwave stores custom data in `meta`, Paystack in `metadata`
  const meta = full.metadata || full.meta || {};
  if (!meta || String(meta.pledge_flow) !== "authorization" || !meta.pledge_id) {
    return { ok: false as const, reason: "not_pledge_auth" };
  }

  // Extract the reusable token/auth code depending on provider
  let authCode: string | undefined;
  if (provider === "flutterwave") {
    authCode = full.card?.token;
  } else {
    authCode = full.authorization?.authorization_code;
  }

  if (!authCode) {
    console.error(`Pledge authorization webhook (${provider}): missing authorization code`, {
      reference,
      pledgeId: meta.pledge_id,
    });
    return { ok: false as const, reason: "no_auth_code" };
  }

  const pledgeId = String(meta.pledge_id);

  const existing = await prisma.pledges.findUnique({
    where: { id: pledgeId },
    select: { id: true, first_transaction_reference: true },
  });

  if (!existing) {
    return { ok: false as const, reason: "pledge_not_found" };
  }
  if (existing.first_transaction_reference) {
    return { ok: true as const, reason: "already_processed" };
  }

  const authEmail =
    full.customer?.email || String(meta.email || "");

  const isReusable =
    provider === "flutterwave" ? true : full.authorization?.reusable;

  await prisma.pledges.update({
    where: { id: pledgeId },
    data: {
      paystack_authorization_code: authCode,
      authorization_email: authEmail,
      first_transaction_reference: reference,
      paystack_payment_status: "authorized",
      ...(isReusable === false
        ? { last_charge_error: "Card marked non-reusable; charge on date may fail." }
        : {}),
    },
  });

  const causeId = String(meta.cause_id);
  const cause = await prisma.cause.findUnique({
    where: { id: causeId },
    select: { title: true },
  });

  const futureAmount = Number(meta.future_pledge_amount ?? meta.amount);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";

  await sendPledgeConfirmationEmail({
    to: String(meta.email),
    userName: String(meta.customer_name || "Supporter"),
    causeTitle: cause?.title || "this campaign",
    amount: futureAmount,
    reminderDate: String(meta.reminder_date || ""),
    donateUrl: `${baseUrl}/causes/${causeId}`,
  });

  return { ok: true as const, reason: "stored" };
}

export async function processPledgeScheduledChargeSuccess(
  reference: string,
  provider: PaymentProviderType = "paystack",
) {
  const full = (await verifyTransactionFull(reference, provider)) as {
    status?: string;
    metadata?: Record<string, string | number | boolean | undefined>;
    meta?: Record<string, string | number | boolean | undefined>;
  };

  const isSuccess =
    provider === "flutterwave"
      ? full.status === "successful"
      : full.status === "success";

  if (!isSuccess) {
    return { ok: false as const, reason: "not_success" };
  }

  const metadata = full.metadata || full.meta || {};
  if (String(metadata.pledge_flow) !== "scheduled_charge") {
    return { ok: false as const, reason: "not_scheduled" };
  }

  const pledgeId = metadata.pledge_id ? String(metadata.pledge_id) : "";
  const causeId = metadata.cause_id ? String(metadata.cause_id) : "";
  if (!pledgeId || !causeId) {
    return { ok: false as const, reason: "missing_ids" };
  }

  const pledge = await prisma.pledges.findUnique({
    where: { id: pledgeId },
    select: { id: true, status: true, user_id: true, paystack_payment_status: true },
  });

  if (!pledge) {
    return { ok: false as const, reason: "pledge_not_found" };
  }
  if (pledge.status === "fulfilled" || pledge.paystack_payment_status === "charged") {
    return { ok: true as const, reason: "already_fulfilled" };
  }

  const amount = Number(metadata.amount);
  await createDonation(
    causeId,
    pledge.user_id ?? null,
    {
      amount,
      name: String(metadata.customer_name || "Supporter"),
      email: String(metadata.email),
      message: "Pledge fulfilled (scheduled charge)",
      isAnonymous: false,
      tip_amount: 0,
    },
    0,
    undefined,
    provider,
  );

  await prisma.pledges.update({
    where: { id: pledgeId },
    data: {
      status: "fulfilled",
      paystack_payment_status: "charged",
      scheduled_charge_reference: reference,
      last_charge_error: null,
    },
  });

  return { ok: true as const, reason: "donation_created" };
}

/**
 * Charge due pledges for today — provider-agnostic.
 * Currently uses Paystack for all pledges (since authorization codes are Paystack's).
 * When Flutterwave pledges exist, this function detects the stored token format
 * and routes to the correct provider.
 */
export async function chargeDuePledgesForToday() {
  // Re-export from pledge-paystack for backward compat
  const { chargeDuePledgesForToday: original } = await import("@/lib/pledge-paystack");
  return original();
}
