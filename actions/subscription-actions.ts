"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface CreateSubscriptionData {
  user_id?: string;
  cause_id: string;
  paystack_subscription_code: string;
  paystack_email_token?: string;
  amount: number;
  interval: string;
  status?: string;
}

export async function createSubscription(data: CreateSubscriptionData) {
  try {
    const subscription = await prisma.subscriptions.create({
      data: {
        user_id: data.user_id || null,
        cause_id: data.cause_id,
        paystack_subscription_code: data.paystack_subscription_code,
        paystack_email_token: data.paystack_email_token,
        amount: data.amount,
        interval: data.interval,
        status: data.status || "active",
      },
    });

    revalidatePath("/dashboard/subscriptions");
    return subscription;
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw new Error("Failed to create subscription record");
  }
}

export async function updateSubscriptionStatus(
  subscriptionCode: string,
  status: string
) {
  try {
    await prisma.subscriptions.updateMany({
      where: { paystack_subscription_code: subscriptionCode },
      data: { status },
    });

    revalidatePath("/dashboard/subscriptions");
  } catch (error) {
    console.error("Error updating subscription status:", error);
    throw new Error("Failed to update subscription status");
  }
}
