import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import { ClaimBanner } from "@/components/claim-banner";
import { isSessionInvalidated } from "@/lib/auth/session-guard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Forces a fresh sign-in for accounts flagged via
  // sessions_invalidated_after (see scripts/invalidate-incident-sessions.ts)
  // — a Server Component can't clear the cookie itself, so it redirects to a
  // route handler that can (app/api/auth/force-signout).
  const invalidated = await isSessionInvalidated(
    session.user.id as string,
    (session.user as any).loginTime,
  );
  if (invalidated) {
    redirect(
      `/api/auth/force-signout?redirect=${encodeURIComponent("/auth/signin")}`,
    );
  }

  // Use the flag from the JWT session to avoid redundant DB hits
  const completedOnboarding = (session.user as any).onboardingCompleted;

  if (completedOnboarding === false) {
    redirect("/onboarding");
  }

  return (
    <ClientLayoutWrapper>
      <ClaimBanner />
      {children}
    </ClientLayoutWrapper>
  );
}
