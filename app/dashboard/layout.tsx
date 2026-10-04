import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import { ClaimBanner } from "@/components/claim-banner";
import { isSessionInvalidated } from "@/lib/auth/session-guard";
import { getCachedProfile } from "@/lib/profile-cache";
import {
  QueryClient,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userId = session.user.id as string;
  const [invalidated, profile] = await Promise.all([
    isSessionInvalidated(userId, (session.user as any).loginTime),
    getCachedProfile(userId).catch(() => null),
  ]);
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

  const queryClient = new QueryClient();
  if (profile) queryClient.setQueryData(["profile", userId], profile);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientLayoutWrapper>
        {/* <ClaimBanner /> */}
        {children}
      </ClientLayoutWrapper>
    </HydrationBoundary>
  );
}
