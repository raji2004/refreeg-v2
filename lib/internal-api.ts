import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

// Internal-only HTTP endpoints (email dispatch etc.) are reachable by anyone
// on the internet, so they must present a shared secret that is not part of
// any client bundle. Server-side callers use internalApiHeaders() to attach it.
export const INTERNAL_API_KEY_HEADER = "x-internal-api-key";

export function assertInternalApiKey(request: Request): NextResponse | null {
  const expected = process.env.INTERNAL_API_KEY || "";

  if (expected) {
    const provided = request.headers.get(INTERNAL_API_KEY_HEADER) || "";
    const providedBuf = Buffer.from(provided, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (
      !provided ||
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return NextResponse.json(
        { error: "Invalid internal API key" },
        { status: 403 },
      );
    }
    return null;
  }

  if (process.env.NODE_ENV === "production") {
    console.error("INTERNAL_API_KEY is not configured; rejecting request");
    return NextResponse.json(
      { error: "Internal API not configured" },
      { status: 503 },
    );
  }

  console.warn("INTERNAL_API_KEY not set; allowing request outside production");
  return null;
}

export function internalApiHeaders(): Record<string, string> {
  return { [INTERNAL_API_KEY_HEADER]: process.env.INTERNAL_API_KEY || "" };
}
