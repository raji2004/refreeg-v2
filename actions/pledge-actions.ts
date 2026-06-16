"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
type CreatePledgeInput = {
  causeId: string;
  amount: number;
  reminderDate: string;
  name: string;
  email: string;
  note?: string | null;
  causeTitle?: string;
};

/** Reminder must be today or a future calendar day (UTC) — past dates rejected. */
function isReminderDateTodayOrFuture(isoDate: string): boolean {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
  const [y, m, d] = parts;
  const selected = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return selected >= today;
}

export async function createPledge(input: CreatePledgeInput) {
  if (!isReminderDateTodayOrFuture(input.reminderDate)) {
    return {
      data: null,
      error: "Reminder date cannot be in the past.",
    };
  }

  const session = await auth();
  const user = session?.user;

  try {
    const data = await prisma.pledges.create({
      data: {
        cause_id: input.causeId,
        user_id: user?.id ?? null,
        amount: input.amount,
        reminder_date: input.reminderDate,
        name: input.name,
        email: input.email,
        note: input.note ?? null,
        currency: "NGN",
        status: "pending",
        token: user?.id ? null : crypto.randomUUID(),
        paystack_payment_status: "awaiting_authorization",
      },
    });

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to create pledge",
    };
  }
}
