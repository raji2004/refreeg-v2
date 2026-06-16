import { createDonation } from "@/actions/donation-actions";
import { prisma } from "@/lib/prisma";
import Paystack from "@/services/paystack";
import { sendPledgeConfirmationEmail } from "@/services/mail";
import { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/pledge-constants";
import { calculateServiceFee } from "@/lib/utils";

export { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/pledge-constants";

export async function processPledgeAuthorizationSuccess(reference: string) {
  const full = (await Paystack.verifyTransactionFull(reference)) as {
    status?: string;
    metadata?: Record<string, string | number | boolean | undefined>;
    authorization?: {
      authorization_code?: string;
      reusable?: boolean;
    };
    customer?: { email?: string };
  };

  if (full.status !== "success") {
    return { ok: false as const, reason: "not_success" };
  }

  const meta = full.metadata;
  if (!meta || String(meta.pledge_flow) !== "authorization" || !meta.pledge_id) {
    return { ok: false as const, reason: "not_pledge_auth" };
  }

  const auth = full.authorization;
  if (!auth?.authorization_code) {
    console.error("Pledge authorization webhook: missing authorization_code", {
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

  await prisma.pledges.update({
    where: { id: pledgeId },
    data: {
      paystack_authorization_code: auth.authorization_code,
      authorization_email: authEmail,
      first_transaction_reference: reference,
      paystack_payment_status: "authorized",
      ...(auth.reusable === false
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

export async function processPledgeScheduledChargeSuccess(reference: string) {
  const full = (await Paystack.verifyTransactionFull(reference)) as {
    status?: string;
    metadata?: Record<string, string | number | boolean | undefined>;
  };

  if (full.status !== "success") {
    return { ok: false as const, reason: "not_success" };
  }

  const metadata = full.metadata || {};
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

export async function chargeDuePledgesForToday() {
  const today = new Date().toISOString().split("T")[0];
  const todayDate = new Date(`${today}T00:00:00.000Z`);

  try {
    const pledges = await prisma.pledges.findMany({
      where: {
        reminder_date: todayDate,
        status: "pending",
        paystack_payment_status: "authorized",
      },
      select: {
        id: true,
        cause_id: true,
        user_id: true,
        amount: true,
        name: true,
        email: true,
        note: true,
        reminder_date: true,
        paystack_authorization_code: true,
        authorization_email: true,
        paystack_payment_status: true,
        status: true,
        scheduled_charge_reference: true,
      },
    });

    const results: { pledgeId: string; ok: boolean; error?: string }[] = [];

    for (const pledge of pledges) {
      if (!pledge.paystack_authorization_code || !pledge.authorization_email) {
        results.push({
          pledgeId: pledge.id,
          ok: false,
          error: "missing_authorization",
        });
        continue;
      }

      const causeRow = await prisma.cause.findUnique({
        where: { id: pledge.cause_id },
        select: { userId: true },
      });

      if (!causeRow?.userId) {
        results.push({
          pledgeId: pledge.id,
          ok: false,
          error: "cause_missing",
        });
        continue;
      }

      const profile = await prisma.user.findUnique({
        where: { id: causeRow.userId },
        select: { subAccountCode: true },
      });

      const subaccount = profile?.subAccountCode?.trim() || undefined;
      const pledgeAmount = Number(pledge.amount);
      const serviceFee = calculateServiceFee(pledgeAmount);
      // Deterministic per pledge + day so retries do not double-charge (Paystack rejects duplicate reference).
      const reference = `pledgech_${pledge.id.replace(/-/g, "")}_${today.replace(/-/g, "")}`;

      try {
        await Paystack.chargeAuthorization({
          authorizationCode: pledge.paystack_authorization_code,
          email: pledge.authorization_email,
          amountNgn: pledgeAmount,
          serviceFeeNgn: serviceFee,
          reference,
          causeId: pledge.cause_id,
          subaccount,
          metadata: {
            pledge_flow: "scheduled_charge",
            pledge_id: pledge.id,
            cause_id: pledge.cause_id,
            amount: pledgeAmount,
            customer_name: pledge.name,
            email: pledge.email,
            message: pledge.note || "",
            is_anonymous: false,
            tip_amount: 0,
            ...(pledge.user_id ? { user_id: pledge.user_id } : {}),
          },
        });

        await prisma.pledges.update({
          where: { id: pledge.id },
          data: {
            charge_attempted_at: new Date(),
          },
        });

        results.push({ pledgeId: pledge.id, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await prisma.pledges.update({
          where: { id: pledge.id },
          data: {
            last_charge_error: msg.slice(0, 500),
            charge_attempted_at: new Date(),
            paystack_payment_status: "charge_failed",
          },
        });

        results.push({ pledgeId: pledge.id, ok: false, error: msg });
      }
    }

    return { today, processed: results.length, results };
  } catch (error: any) {
    throw new Error(error.message || String(error));
  }
}
