import { createDonation } from "@/actions/donation-actions";
import Paystack from "@/services/paystack";
import {
  processPledgeAuthorizationSuccess,
  processPledgeScheduledChargeSuccess,
} from "@/lib/pledge-paystack";

type ChargeResult = { ok: true; reason: string } | { ok: false; reason: string };

/**
 * Verifies a Paystack reference and records the resulting donation/pledge.
 * Shared by the webhook and the client-side verify endpoint so a donation is
 * recorded as soon as the donor is redirected back, without depending solely
 * on webhook delivery. Safe to call more than once for the same reference —
 * createDonation and the pledge processors are idempotent on it.
 */
export async function processSuccessfulCharge(
  reference: string,
): Promise<ChargeResult> {
  const full = (await Paystack.verifyTransactionFull(reference)) as {
    status?: string;
    metadata?: Record<string, string | number | boolean | undefined>;
  };

  if (full.status !== "success") {
    return { ok: false, reason: "not_success" };
  }

  const meta = full.metadata || {};

  if (String(meta.pledge_flow) === "authorization") {
    return processPledgeAuthorizationSuccess(reference);
  }

  if (String(meta.pledge_flow) === "scheduled_charge") {
    return processPledgeScheduledChargeSuccess(reference);
  }

  if (!meta.cause_id) {
    return { ok: false, reason: "missing_cause_id" };
  }

  await createDonation(
    String(meta.cause_id),
    meta.user_id ? String(meta.user_id) : null,
    {
      amount: Number(meta.amount),
      name: String(meta.customer_name || ""),
      email: String(meta.email || ""),
      message: String(meta.message || ""),
      isAnonymous: Boolean(meta.is_anonymous),
      tip_amount: Number(meta.tip_amount || 0),
    },
    undefined,
    reference,
  );

  return { ok: true, reason: "donation_created" };
}
