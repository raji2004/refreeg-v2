import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/utils/api-bot/api-keys";
import type { Database } from "@/types/database-types";
import { 
  errorResponse, 
  ApiErrorCode 
} from "@/utils/api-bot/response-utils";
import { CORS_HEADERS } from "@/utils/api-bot/cors";

/**
 * Validates an API key from the Authorization header.
 * Use this at the top of your `app/api/bot/*` route handlers.
 *
 * @returns { user_id, mode, apiKeyId, errorResponse }
 */
export async function validateApiKey(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { 
      errorResponse: errorResponse(
        "Invalid or missing Authorization header", 
        ApiErrorCode.UNAUTHORIZED, 
        401
      ) 
    };
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return { 
      errorResponse: errorResponse(
        "Missing Bearer token", 
        ApiErrorCode.UNAUTHORIZED, 
        401
      ) 
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
        401
      ) 
    };
  }

  // Update last_used_at
  prisma.api_keys.update({
    where: { id: apiKey.id },
    data: { last_used_at: new Date() },
  }).catch((error) => console.error("Failed to update last_used_at", error));


  return {
    apiKeyId: apiKey.id,
    userId: apiKey.user_id,
    mode: apiKey.mode as "live" | "test",
  };
}

/**
 * Advanced in-memory rate limiter.
 * This can be replaced with a Redis-backed store for production clusters.
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 60; // 60 requests per minute

export function rateLimit(request: NextRequest, max = DEFAULT_MAX_REQUESTS, window = DEFAULT_WINDOW_MS) {
  // Use IP or API Key for identification
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const keyIdentifier = request.headers.get("Authorization") || ip;
  const now = Date.now();
  const userData = rateLimitMap.get(keyIdentifier) || { count: 0, lastReset: now };

  if (now - userData.lastReset > window) {
    userData.count = 1;
    userData.lastReset = now;
  } else {
    userData.count++;
  }

  rateLimitMap.set(keyIdentifier, userData);

  if (userData.count > max) {
    return {
      errorResponse: errorResponse(
        "Rate limit exceeded. Try again in a minute.", 
        ApiErrorCode.RATE_LIMIT_EXCEEDED, 
        429
      ),
    };
  }

  return null;
}

/**
 * Simple preflight OPTIONS handler for all bot routes
 */
export function handlePreflight() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
