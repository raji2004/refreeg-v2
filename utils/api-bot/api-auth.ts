import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/utils/api-bot/api-keys";
import type { Database } from "@/types/database-types";
import { errorResponse, ApiErrorCode } from "@/utils/api-bot/response-utils";
import { getClientIp } from "@/lib/api/client-ip";
import { createRateLimiter } from "@/lib/api/rate-limit";
import { CORS_HEADERS } from "@/utils/api-bot/cors";

export async function validateApiKey(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      errorResponse: errorResponse(
        "Invalid or missing Authorization header",
        ApiErrorCode.UNAUTHORIZED,
        401,
      ),
    };
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return {
      errorResponse: errorResponse(
        "Missing Bearer token",
        ApiErrorCode.UNAUTHORIZED,
        401,
      ),
    };
  }

  const keyHash = hashApiKey(token);

  let apiKey;
  try {
    apiKey = await prisma.api_keys.findFirst({
      where: {
        key_hash: keyHash,
        revoked_at: null,
      },
      select: {
        id: true,
        user_id: true,
        mode: true,
      },
    });
  } catch (error) {
    console.error("Database error validating API key:", error);
  }

  if (!apiKey) {
    return {
      errorResponse: errorResponse(
        "Invalid or revoked API key",
        ApiErrorCode.UNAUTHORIZED,
        401,
      ),
    };
  }

  prisma.api_keys
    .update({
      where: { id: apiKey.id },
      data: { last_used_at: new Date() },
    })
    .catch((error) => console.error("Failed to update last_used_at", error));

  return {
    apiKeyId: apiKey.id,
    userId: apiKey.user_id,
    mode: apiKey.mode as "live" | "test",
  };
}

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 60;
const limiters = new Map<string, ReturnType<typeof createRateLimiter>>();

export function rateLimit(
  request: NextRequest,
  max = DEFAULT_MAX_REQUESTS,
  window = DEFAULT_WINDOW_MS,
) {
  // Keyed by client address only: the Authorization header is attacker-chosen
  // and rotating it must not reset the limit. The key set is bounded.
  const ip = getClientIp(request.headers) || "unknown";
  const limiterId = `${max}:${window}`;
  let limited = limiters.get(limiterId);
  if (!limited) {
    limited = createRateLimiter({ max, windowMs: window });
    limiters.set(limiterId, limited);
  }

  if (limited(ip)) {
    return {
      errorResponse: errorResponse(
        "Rate limit exceeded. Try again in a minute.",
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        429,
      ),
    };
  }

  return null;
}

export function handlePreflight() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
