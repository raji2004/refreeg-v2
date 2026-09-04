"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

/**
 * Persists a Discover filter snapshot as an alert. This does NOT match new
 * campaigns against the saved filters or notify the user — there's no
 * job/cron infrastructure in this codebase for that yet. It only saves the
 * filter set so that piece can be built as a fast-follow.
 */
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
