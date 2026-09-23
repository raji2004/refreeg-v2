import { NextResponse } from "next/server";

/**
 * Clears every plausible csrf-token/callback-url cookie variant (current
 * prefixed names and legacy unprefixed ones, from before this app's cookies
 * moved through several Domain/host configurations this week) before a
 * fresh Google sign-in attempt. These are pure OAuth-handshake helpers that
 * Auth.js regenerates on every attempt anyway — clearing them never signs
 * anyone out (session-token is untouched) — but a stale/mismatched one left
 * over from an earlier host config can make Auth.js's CSRF check fail
 * silently, bouncing the user back to the sign-in page with no error. This
 * has to run server-side: Auth.js's csrf-token cookie is HttpOnly, so
 * client JS can't see or clear it via document.cookie.
 */
const HELPER_COOKIE_NAMES = [
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
];

export async function POST() {
  const response = NextResponse.json({ success: true });

  for (const name of HELPER_COOKIE_NAMES) {
    response.cookies.set(name, "", {
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });
  }

  response.headers.set("Cache-Control", "no-store");
  return response;
}
