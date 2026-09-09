import { auth } from "@/lib/auth/auth";
import { type NextRequest, NextResponse } from "next/server";
import { hasCompletedOnboarding } from "@/actions/profile-actions";

function normalizeRedirectPath(target: string | null): string | null {
  if (!target) return null;
  if (!target.startsWith("/")) return null;
  if (target.startsWith("//")) return null;
  return target;
}

// Builds an absolute URL from the request's own forwarded headers instead
// of request.url — in this self-hosted standalone deployment, request.url
// has been observed to resolve to the server's bind address (0.0.0.0:3000,
// from ecosystem.config.js's HOSTNAME) instead of the real public host when
// the reverse proxy doesn't send X-Forwarded-Host (see nginx/nginx.conf).
// Explicit headers are safe regardless of proxy config.
function absoluteUrl(path: string, request: NextRequest): URL {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return new URL(path, `${proto}://${host}`);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const requestedRedirect = normalizeRedirectPath(
    request.nextUrl.searchParams.get("redirect"),
  );

  if (!session?.user?.id) {
    return NextResponse.redirect(absoluteUrl("/auth/signin", request));
  }

  const completedOnboarding =
    session.user.onboardingCompleted ??
    (await hasCompletedOnboarding(session.user.id));

  if (!completedOnboarding) {
    const onboardingUrl = absoluteUrl("/onboarding", request);
    if (requestedRedirect) {
      onboardingUrl.searchParams.set("redirect", requestedRedirect);
    }
    return NextResponse.redirect(onboardingUrl);
  }

  return NextResponse.redirect(
    absoluteUrl(requestedRedirect || "/dashboard", request),
  );
}
