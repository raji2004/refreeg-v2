"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateApiKey, hashApiKey } from "@/utils/api-bot/api-keys";

export async function createApiKey(name: string, mode: "live" | "test") {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const user = session.user;

  // Check role/account type
  const profile = await prisma.user.findUnique({
    where: { id: user.id as string },
    select: { accountType: true },
  });

  if (profile?.accountType !== "developer") {
    throw new Error("Only developers can create API keys");
  }

  const { fullKey, displayPrefix } = generateApiKey(mode);
  const keyHash = hashApiKey(fullKey);

  try {
    const data = await prisma.api_keys.create({
      data: {
        user_id: user.id as string,
        name,
        key_prefix: displayPrefix,
        key_hash: keyHash,
        mode,
      },
    });

    revalidatePath("/dashboard/developer/api-keys");

    // Return the full key ONLY ONCE so the UI can show it
    return { ...data, rawKey: fullKey };
  } catch (error) {
    throw new Error(`Failed to create API key: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function getApiKeys() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  try {
    const data = await prisma.api_keys.findMany({
      where: {
        user_id: session.user.id as string,
        revoked_at: null,
      },
      orderBy: { created_at: "desc" },
    });

    return data;
  } catch (error) {
    throw new Error("Failed to fetch API keys");
  }
}

export async function revokeApiKey(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  try {
    await prisma.api_keys.update({
      where: { 
        id,
        user_id: session.user.id as string, // Ensure user owns the key
      },
      data: { revoked_at: new Date() },
    });

    revalidatePath("/dashboard/developer/api-keys");
    return true;
  } catch (error) {
    throw new Error("Failed to revoke key");
  }
}
