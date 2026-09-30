import { createDonation } from "@/actions/donation-actions";
import { verifyTransactionFull } from "@/services/payment-provider";
import {
  processPledgeAuthorizationSuccess,
  processPledgeScheduledChargeSuccess,
} from "@/lib/pledge-provider";

type ChargeResult =
  { ok: true; reason: string } | { ok: false; reason: string };

export async function processSuccessfulCharge(
  reference: string,
): Promise<ChargeResult> {
  const full = (await verifyTransactionFull(reference, "paystack")) as {
    status?: string;
    metadata?: Record<string, string | number | boolean | undefined>;
  };

  if (full.status !== "success") {
    return { ok: false, reason: "not_success" };
  }

  const meta = full.metadata || {};

  if (String(meta.pledge_flow) === "authorization") {
    return processPledgeAuthorizationSuccess(reference, "paystack");
  }

  if (String(meta.pledge_flow) === "scheduled_charge") {
    return processPledgeScheduledChargeSuccess(reference, "paystack");
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
    "paystack",
    meta.ref_v1 ? String(meta.ref_v1) : undefined,
  );

  return { ok: true, reason: "donation_created" };
}
