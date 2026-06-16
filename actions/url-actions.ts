"use server";

import { prisma } from "@/lib/prisma";
import { getBaseURL } from "@/lib/utils";

function generateShortCode(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createShortUrl(
  entityId: string,
  entityType: "cause" | "petition",
  originalUrl: string,
): Promise<string> {
  const baseUrl = getBaseURL();

  // Check if a short URL already exists for this entity
  const existing = await prisma.short_urls.findFirst({
    where: { entity_id: entityId, entity_type: entityType },
    select: { short_code: true },
  });

  if (existing) {
    return `${baseUrl}/s/${existing.short_code}`;
  }

  // Generate a unique short code
  let shortCode = generateShortCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const collision = await prisma.short_urls.findUnique({
      where: { short_code: shortCode },
      select: { short_code: true },
    });

    if (!collision) {
      break;
    }

    shortCode = generateShortCode();
    attempts++;
  }

  if (attempts === maxAttempts) {
    throw new Error("Failed to generate unique short code");
  }

  await prisma.short_urls.create({
    data: {
      short_code: shortCode,
      entity_id: entityId,
      entity_type: entityType,
      original_url: originalUrl,
      clicks: 0,
    },
  });

  return `${baseUrl}/s/${shortCode}`;
}

export async function getOriginalUrl(
  shortCode: string,
): Promise<string | null> {
  const data = await prisma.short_urls.findUnique({
    where: { short_code: shortCode },
  });

  if (!data) {
    return null;
  }

  // Atomic increment — no race condition
  await prisma.short_urls.update({
    where: { short_code: shortCode },
    data: { clicks: { increment: 1 } },
  });

  return data.original_url;
}

export async function getShortUrlAnalytics(
  entityId: string,
  entityType: "cause" | "petition",
): Promise<{ clicks: number; shortUrl: string } | null> {
  const baseUrl = getBaseURL();

  const data = await prisma.short_urls.findFirst({
    where: { entity_id: entityId, entity_type: entityType },
    select: { short_code: true, clicks: true },
  });

  if (!data) {
    return null;
  }

  return {
    clicks: data.clicks || 0,
    shortUrl: `${baseUrl}/s/${data.short_code}`,
  };
}
