import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import { ClaimBanner } from "@/components/claim-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
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
