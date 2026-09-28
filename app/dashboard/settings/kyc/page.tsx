import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getCachedProfile } from "@/lib/profile-cache";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsShell } from "../components/settings-shell";
import { KycSettingsContent } from "./kyc-settings-content";

export default async function KycSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const profile = await getCachedProfile(session.user.id).catch(() => null);

  return (
    <Suspense
      fallback={
        <SettingsShell>
          <Skeleton className="h-[400px] w-full" />
        </SettingsShell>
      }
    >
      <KycSettingsContent
        profile={profile}
        user={{ id: session.user.id, email: session.user.email ?? "" }}
      />
    </Suspense>
  );
}
