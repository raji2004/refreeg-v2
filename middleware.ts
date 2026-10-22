import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { handleCorsPreflight } from "@/lib/api/response";

const PUBLIC_API_PREFIXES = [
  "/api/auth", // NextAuth routes
  "/api/health", // Monitoring health checks
  "/api/error-report", // Same-origin browser error intake (rate limited)
  "/api/bot", // Developer API — authenticated via API keys
  "/api/mobile", // Mobile API - authenticated via custom JWT
  "/api/webhooks", // Incoming webhooks (Paystack, etc.)
  "/api/payments", // Guest donation checkout + verification
  "/api/cron", // Scheduled jobs (CRON_SECRET)
  "/api/cities", // Public lookup data
  "/api/countries", // Public lookup data
  "/api/states", // Public lookup data
  "/api/mail", // Donor-facing email endpoints (no auth required)
  "/api/s3", // S3 image proxy (public images)
  "/api/dev", // Temporary local dev/testing routes
  "/api/leaderboard", // Public leaderboard rankings
];

const AUTH_PAGES_WITH_OWN_SESSION_HANDLING = [
  "/auth/callback",
  "/auth/signin",
  "/auth/signup",
  "/auth/confirm-email-change",
  "/auth/update-password",
];

function absoluteUrl(path: string, req: Request): URL {
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return new URL(path, `${proto}://${host}`);
}

export default async function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight();
  }

  const { pathname } = req.nextUrl;

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req, secret });
  const user = token
    ? {
        id: (token.id || token.sub) as string,
        role: token.role as string | undefined,
        onboardingCompleted: token.onboardingCompleted as boolean | undefined,
      }
    : null;

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

  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");

  if (isProtectedRoute && !user) {
    const signInUrl = absoluteUrl("/auth/signin", req);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (pathname.startsWith("/dashboard/admin") && user) {
    const role = user.role;
    if (role === "user") {
      return NextResponse.redirect(absoluteUrl("/dashboard", req));
    }
  }

  if (
    user &&
    pathname.startsWith("/auth") &&
    !AUTH_PAGES_WITH_OWN_SESSION_HANDLING.includes(pathname)
  ) {
    return NextResponse.redirect(absoluteUrl("/dashboard", req));
  }

  const isOnboardingCompleted = user?.onboardingCompleted;

  if (
    user &&
    isOnboardingCompleted === false &&
    pathname.startsWith("/dashboard")
  ) {
    return NextResponse.redirect(absoluteUrl("/onboarding", req));
  }

  const refV1 = req.nextUrl.searchParams.get("ref_v1");
  if (refV1) {
    const response = NextResponse.next();
    response.cookies.set("ref_v1", refV1, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 30,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
