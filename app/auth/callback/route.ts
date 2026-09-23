import { auth } from "@/lib/auth/auth";
import { type NextRequest, NextResponse } from "next/server";
import { hasCompletedOnboarding } from "@/actions/profile-actions";
import { prisma } from "@/lib/prisma";

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

  const isOrgIntent = request.cookies.get("auth_org_intent")?.value === "true";
  if (isOrgIntent && session.user.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { accountType: true },
    });

    // Only tag as organization if not already set, protecting existing individual accounts
    if (!dbUser?.accountType) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { accountType: "organization" },
      });
    }
  }

  const completedOnboarding =
    session.user.onboardingCompleted ??
    (await hasCompletedOnboarding(session.user.id));

  let redirectUrl: URL;
  if (!completedOnboarding) {
    redirectUrl = absoluteUrl("/onboarding", request);
    if (requestedRedirect) {
      redirectUrl.searchParams.set("redirect", requestedRedirect);
    }
  } else {
    redirectUrl = absoluteUrl(requestedRedirect || "/dashboard", request);
  }

  const response = NextResponse.redirect(redirectUrl);
  if (isOrgIntent) {
    response.cookies.delete("auth_org_intent");
  }

  return response;
}
