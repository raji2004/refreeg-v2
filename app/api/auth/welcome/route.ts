import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { deriveFullNameFromEmail } from "@/lib/auth/registration";
import { runPostSignupActions } from "@/lib/auth/welcome";

const NEW_USER_WINDOW_MS = 5 * 60 * 1000;

function hasValidSecret(provided: string | null) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!hasValidSecret(req.headers.get("x-internal-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await req.json().catch(() => ({}));
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true, accountType: true, createdAt: true },
  });

  // Only freshly created accounts, so a replayed call can't re-send.
  if (
    !user?.email ||
    Date.now() - new Date(user.createdAt).getTime() > NEW_USER_WINDOW_MS
  ) {
    return NextResponse.json({ success: false }, { status: 404 });
  }

  await runPostSignupActions({
    email: user.email,
    fullName: user.fullName || deriveFullNameFromEmail(user.email),
    accountType: user.accountType,
  });

  return NextResponse.json({ success: true });
}
