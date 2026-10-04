import {
  NextFetchEvent,
  NextRequest,
  NextResponse,
  type NextMiddleware,
} from "next/server";
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

function rememberReferral(req: NextRequest) {
  const refV1 = req.nextUrl.searchParams.get("ref_v1");
  if (!refV1) return NextResponse.next();

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

function needsSession(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api")
  );
}

const handleAuth = auth(async (req) => {
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

  return rememberReferral(req);
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (needsSession(req.nextUrl.pathname)) {
    // auth()'s return type is a union with the route-handler signature;
    // called with (req, event) it runs as middleware.
    return (handleAuth as unknown as NextMiddleware)(req, event);
  }

  return rememberReferral(req);
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/auth",
    "/auth/:path*",
    // Every API route except the public image proxy, whose cacheable
    // responses must not pick up auth cookies.
    "/api/((?!s3/image).*)",
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|api/|dashboard|onboarding|auth|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      has: [{ type: "query", key: "ref_v1" }],
    },
  ],
};
