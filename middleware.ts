import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/api/error-report",
  "/api/bot",
  "/api/webhooks",
  "/api/payments",
  "/api/cron",
  "/api/cities",
  "/api/countries",
  "/api/states",
  "/api/mail",
  "/api/s3",
  "/api/dev",
  "/api/leaderboard",
];

function absoluteUrl(path: string, req: Request): URL {
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return new URL(path, `${proto}://${host}`);
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

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
    const role = (user as { role?: string }).role;
    if (role === "user") {
      return NextResponse.redirect(absoluteUrl("/dashboard", req));
    }
  }

  const AUTH_PAGES_WITH_OWN_SESSION_HANDLING = [
    "/auth/callback",
    "/auth/signin",
    "/auth/signup",
    "/auth/confirm-email-change",
    "/auth/update-password",
  ];
  if (
    user &&
    pathname.startsWith("/auth") &&
    !AUTH_PAGES_WITH_OWN_SESSION_HANDLING.includes(pathname)
  ) {
    return NextResponse.redirect(absoluteUrl("/dashboard", req));
  }

  const isOnboardingCompleted = (req.auth?.user as any)?.onboardingCompleted;

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
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
