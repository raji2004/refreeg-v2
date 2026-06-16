import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

/**
 * Public API route prefixes that do NOT require a user session.
 * These routes either use their own auth (API keys) or are intentionally public.
 */
const PUBLIC_API_PREFIXES = [
  "/api/auth", // NextAuth routes
  "/api/bot", // Developer API — authenticated via API keys
  "/api/webhooks", // Incoming webhooks (Paystack, etc.)
  "/api/payments", // Guest donation checkout + verification
  "/api/cron", // Scheduled jobs (CRON_SECRET)
  "/api/cities", // Public lookup data
  "/api/countries", // Public lookup data
  "/api/states", // Public lookup data
  "/api/mail", // Donor-facing email endpoints (no auth required)
  "/api/s3", // S3 image proxy (public images)
];

const APP_ROUTE_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/auth",
  "/causes",
  "/campaign",
  "/petitions",
  "/referrals",
  "/api",
  "/s",
];

const APP_HOST = "apps.refreeg.com";
const WWW_HOST = "www.refreeg.com";
const Test_HOST = "http://localhost:3000/"

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const hostHeader =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const forwardedProto = req.headers.get("x-forwarded-proto") || "";
  const targetProtocol = forwardedProto
    ? `${forwardedProto.split(",")[0].trim()}:`
    : req.nextUrl.protocol;
  const host = hostHeader.split(":")[0].toLowerCase();

  // ── 0. Domain split for single-process deployment ────────────────
  // Keep landing pages on www and app features on apps while both hosts
  // are served by the same Next.js process.
  const isAppRoute = APP_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (host === WWW_HOST && isAppRoute) {
    const target = req.nextUrl.clone();
    target.hostname = APP_HOST;
    target.protocol = targetProtocol;
    target.port = req.nextUrl.port;
    return NextResponse.redirect(target, 308);
  }

  if (host === APP_HOST && !isAppRoute && pathname !== "/") {
    const target = req.nextUrl.clone();
    target.hostname = WWW_HOST;
    target.protocol = targetProtocol;
    target.port = req.nextUrl.port;
    return NextResponse.redirect(target, 308);
  }

  // ── 1. Protect API routes ─────────────────────────────────────────
  // Return 401 for authenticated API routes when no session exists.
  // Public API routes (bot, webhooks, lookups, mail) are excluded.
  if (pathname.startsWith("/api")) {
    const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix),
    );

    if (!isPublicApi && !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
  }

  // ── 2. Redirect unauthenticated users away from protected pages ───
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");

  if (isProtectedRoute && !user) {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // ── 3. Redirect authenticated users away from auth pages ──────────
  if (user && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // ── 4. Onboarding Redirect ────────────────────────────────────────
  const isOnboardingCompleted = (req.auth?.user as any)?.onboardingCompleted;

  if (
    user &&
    isOnboardingCompleted === false &&
    pathname.startsWith("/dashboard")
  ) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
