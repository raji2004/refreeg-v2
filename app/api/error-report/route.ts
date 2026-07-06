import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reportToRefreegAlert } from "@/lib/refreeg-alert-reporter";

export const dynamic = "force-dynamic";

const reportSchema = z.object({
  type: z.enum(["window", "unhandled-rejection", "react"]),
  name: z.string().min(1).max(80).default("Error"),
  message: z.string().min(1).max(1_000),
  path: z.string().max(500).optional(),
  stack: z.string().max(4_000).optional(),
});

const windows = new Map<string, { count: number; expiresAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REPORTS_PER_WINDOW = 20;

function requestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = (request.headers.get("x-forwarded-host") ||
    request.headers.get("host"))
    ?.split(",")[0]
    .trim();
  if (!origin || !host) return false;

  try {
    const forwardedProtocol = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      .trim();
    const protocol =
      forwardedProtocol || new URL(request.url).protocol.replace(/:$/, "");
    const expectedOrigin = new URL(`${protocol}://${host}`).origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function isRateLimited(ip: string, now = Date.now()) {
  if (windows.size > 10_000) {
    for (const [key, value] of windows) {
      if (value.expiresAt <= now) windows.delete(key);
    }
    if (windows.size > 10_000) windows.clear();
  }

  const current = windows.get(ip);
  if (!current || current.expiresAt <= now) {
    windows.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > MAX_REPORTS_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  if (isRateLimited(requestIp(request))) {
    return NextResponse.json({ error: "Too many reports." }, { status: 429 });
  }

  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  }

  const sent = await reportToRefreegAlert({
    source: "browser",
    name: parsed.data.name,
    message: parsed.data.message,
    path: parsed.data.path,
    stack: parsed.data.stack,
  });

  if (!sent) {
    return NextResponse.json({ error: "Reporter unavailable." }, { status: 503 });
  }

  return NextResponse.json({ accepted: true }, { status: 202 });
}
