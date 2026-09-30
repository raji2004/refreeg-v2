"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

export async function createSavedSearchAlert(input: {
  label: string;
  query: Record<string, unknown>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { data: null, error: "Sign in to save an alert." };
  }

  const saved = await prisma.saved_searches.create({
    data: {
      user_id: userId,
      label: input.label,
      query: input.query as any,
    },
  });

  return { data: saved, error: null };
}

export async function listSavedSearchAlerts() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return [];

  return prisma.saved_searches.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });
}
