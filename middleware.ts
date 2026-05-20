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
  "/auth",
  "/dashboard",
  "/onboarding",
  "/causes",
  "/campaign",
  "/petitions",
  "/referrals",
  "/[username]",
  "/s",
];

const LANDING_ROUTE_PREFIXES = [
  "/",
  "/about-us",
  "/how-it-works",
  "/how-to-start-a-cause",
  "/businesses",
  "/creators",
  "/non-profits",
  "/disaster-relief",
  "/healthcare",
  "/crowdfund",
  "/ai-agent",
  "/coming-soon",
  "/faq",
  "/guide",
  "/docs",
  "/privacy",
  "/terms",
  "/theme",
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get("host") || "").toLowerCase();
  const user = req.auth?.user;

  // ── 0. Host-based routing between landing and app subdomains ─────
  // Keep local/staging hosts untouched; only enforce on production domains.
  const isWwwHost = host === "www.refreeg.com";
  const isAppsHost = host === "apps.refreeg.com";

  if (isWwwHost) {
    const isAppRoute = APP_ROUTE_PREFIXES.some((prefix) =>
      matchesPrefix(pathname, prefix),
    );

    if (isAppRoute) {
      const destination = new URL(req.url);
      destination.hostname = "apps.refreeg.com";
      return NextResponse.redirect(destination, 308);
    }
  }

  if (isAppsHost) {
    const isLandingRoute = LANDING_ROUTE_PREFIXES.some((prefix) =>
      matchesPrefix(pathname, prefix),
    );

    if (isLandingRoute) {
      const destination = new URL(req.url);
      destination.hostname = "www.refreeg.com";
      return NextResponse.redirect(destination, 308);
    }
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
