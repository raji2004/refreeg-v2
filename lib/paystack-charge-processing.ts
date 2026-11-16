import { createDonation } from "@/actions/donation-actions";
import { verifyTransactionFull } from "@/services/payment-provider";
import { calculateProviderFee, calculateServiceFee } from "@/lib/utils";
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
    amount?: number;
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

  // Cross-check the amount Paystack actually charged against the total the
  // server-side fee formulas imply from the metadata. metadata.amount is the
  // donor's chosen amount in naira; Paystack reports the charged total in
  // kobo. A mismatch means the transaction does not match what was
  // initialized, so the charge is left for manual review rather than
  // recorded (SAW-013).
  const donationNaira = Number(meta.amount);
  const tipNaira = Number(meta.tip_amount || 0);
  const expectedTotalKobo = Math.round(
    (donationNaira +
      calculateServiceFee(donationNaira) +
      calculateProviderFee(donationNaira, "paystack") +
      tipNaira) *
      100,
  );
  const chargedKobo = Number(full.amount);

  if (
    !Number.isFinite(chargedKobo) ||
    !Number.isFinite(donationNaira) ||
    chargedKobo !== expectedTotalKobo
  ) {
    console.error(
      `[Paystack] Amount mismatch for ${reference}: charged ${chargedKobo} kobo, metadata implies ${expectedTotalKobo} kobo - not recording donation`,
    );
    return { ok: false, reason: "amount_mismatch" };
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
