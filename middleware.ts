import {
  NextFetchEvent,
  NextRequest,
  NextResponse,
  type NextMiddleware,
} from "next/server";
import { getToken } from "next-auth/jwt";
import { auth } from "@/lib/auth/auth";
import { handleCorsPreflight } from "@/lib/api/response";
import { publicFileManifest } from "@/lib/public-file-manifest";

const PUBLIC_FILES = new Set<string>(publicFileManifest);

const IMAGE_EXT = /\.(?:png|jpe?g|gif|webp|svg|ico|avif)$/i;

const SOURCE_FILE_EXT = /\.(?:js|ts|map)$/i;

// Icons served from app/ (favicon.ico, icon.*, apple-icon.*), which aren't in public/.
const APP_ICON_PATH =
  /^\/(?:favicon\.ico|(?:apple-)?icon\d*\.(?:ico|png|jpe?g|svg))$/i;

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

  return rememberReferral(req);
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight();
  }

  const { pathname } = req.nextUrl;

  // Scanners probe for source files (e.g. /api/auth/pre-signin-cleanup.js); without this they reach Auth.js and log UnknownAction.
  if (pathname.startsWith("/api/") && SOURCE_FILE_EXT.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  if (IMAGE_EXT.test(pathname)) {
    if (!PUBLIC_FILES.has(pathname) && !APP_ICON_PATH.test(pathname)) {
      // A raster placeholder, so /_next/image (which rejects SVG and text) still gets an image.
      const url = req.nextUrl.clone();
      url.pathname = "/placeholder.jpg";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (needsSession(pathname)) {
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
    "/:path*.:ext(png|jpg|jpeg|gif|webp|svg|ico|avif)",
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|api/|dashboard|onboarding|auth|monitoring|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      has: [{ type: "query", key: "ref_v1" }],
    },
  ],
};
