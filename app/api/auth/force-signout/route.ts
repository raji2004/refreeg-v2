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

  // Built from the incoming request's own Host header, not req.url's own
  // origin — in this self-hosted standalone deployment, req.url has been
  // observed to resolve to the server's bind address (0.0.0.0:3000, from
  // ecosystem.config.js's HOSTNAME) instead of the real public host when
  // the reverse proxy doesn't send X-Forwarded-Host (see nginx/nginx.conf).
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const target = new URL(`${forwardedProto}://${forwardedHost}${redirectTo}`);
  target.searchParams.set("reason", "security-reset");
  return NextResponse.redirect(target);
}
