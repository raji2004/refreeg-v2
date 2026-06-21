import { auth } from "@/lib/auth/auth";
import { type NextRequest, NextResponse } from "next/server";
import { hasCompletedOnboarding } from "@/actions/profile-actions";

function normalizeRedirectPath(target: string | null): string | null {
  if (!target) return null;
  if (!target.startsWith("/")) return null;
  if (target.startsWith("//")) return null;
  return target;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const requestedRedirect = normalizeRedirectPath(
    request.nextUrl.searchParams.get("redirect"),
  );

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const completedOnboarding =
    session.user.onboardingCompleted ??
    (await hasCompletedOnboarding(session.user.id));

  if (!completedOnboarding) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return NextResponse.redirect(
    new URL(requestedRedirect || "/dashboard", request.url),
  );
}
