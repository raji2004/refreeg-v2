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

  const invalidated = await isSessionInvalidated(
    session.user.id as string,
    (session.user as any).loginTime,
  );
  if (invalidated) {
    redirect(
      `/api/auth/force-signout?redirect=${encodeURIComponent("/auth/signin")}`,
    );
  }

  // Ensure users with incomplete onboarding are routed to the profile flow
  const completedOnboarding = (session.user as any).onboardingCompleted;

  if (!completedOnboarding) {
    redirect("/onboarding");
  }

  return (
    <ClientLayoutWrapper>
      {/* <ClaimBanner /> */}
      {children}
    </ClientLayoutWrapper>
  );
}
