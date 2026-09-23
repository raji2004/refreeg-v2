"use client";

import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationsForm } from "../notifications-form";
import { SettingsShell } from "../components/settings-shell";

export default function NotificationsSettingsPage() {
  const { user } = useAuth();
  const { profile, isLoading } = useProfile(user?.id);

  if (isLoading) {
    return (
      <SettingsShell>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-3 h-5 w-80" />
        <Skeleton className="mt-8 h-[520px] w-full rounded-2xl" />
      </SettingsShell>
    );
  }

  return (
    <SettingsShell isOrganization={profile?.account_type === "organization"}>
      <NotificationsForm />
    </SettingsShell>
  );
}
