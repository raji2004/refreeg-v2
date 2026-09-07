import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth/auth";

/**
 * Clears the current session cookie server-side and redirects to sign-in.
 * Used when a Server Component (which can't itself mutate cookies) detects
 * a session that's past its account's sessions_invalidated_after cutoff —
 * see lib/auth/session-guard.ts and app/dashboard/layout.tsx.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirect") || "/auth/signin";

  await signOut({ redirect: false });

  const target = new URL(redirectTo, req.url);
  target.searchParams.set("reason", "security-reset");
  return NextResponse.redirect(target);
}
