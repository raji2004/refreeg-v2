import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function logApiRequest({
  request,
  statusCode,
  apiKeyId,
  userId,
  mode,
  errorCode,
  startedAt,
}: {
  request: NextRequest;
  statusCode: number;
  apiKeyId?: string | null;
  userId?: string | null;
  mode?: string | null;
  errorCode?: string | null;
  startedAt?: number;
}) {
  try {
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    await prisma.api_request_logs.create({
      data: {
        api_key_id: apiKeyId ?? null,
        user_id: userId ?? null,
        endpoint: request.nextUrl.pathname,
        method: request.method,
        mode: mode ?? null,
        status_code: statusCode,
        error_code: errorCode ?? null,
        ip_address: ipAddress,
        response_time_ms: startedAt ? Date.now() - startedAt : null,
      }
    });
  } catch (error) {
    console.error("Failed to log API request", error);
  }
}