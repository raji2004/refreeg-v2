"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth-actions";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function getWebhooks() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const data = await prisma.api_webhooks.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
  });

  return data;
}

export async function createWebhook(url: string, events: string[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Generate secret
  const secret = `wh_sec_${crypto.randomBytes(24).toString("hex")}`;

  const data = await prisma.api_webhooks.create({
    data: {
      user_id: user.id,
      url,
      events,
      secret,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/developer/webhooks");
  return data;
}

export async function deleteWebhook(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.api_webhooks.deleteMany({
    where: { id, user_id: user.id },
  });

  revalidatePath("/dashboard/developer/webhooks");
}

export async function getWebhookLogs(webhookId?: string, limit = 50) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const where: any = {
    webhook: { user_id: user.id },
  };

  if (webhookId) {
    where.webhook_id = webhookId;
  }

  const data = await prisma.api_webhook_logs.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: limit,
    include: {
      webhook: {
        select: { url: true, user_id: true },
      },
    },
  });

  return data;
}
