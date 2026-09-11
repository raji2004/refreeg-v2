"use client";

import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteAccountButton } from "../delete-account-button";
import { PasswordForm } from "../password-form";
import { SettingsShell } from "../components/settings-shell";

export default function AccountSettingsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SettingsShell>
        <Skeleton className="h-[400px] w-full" />
      </SettingsShell>
    );
  }

  return (
    <SettingsShell>
      <div className="space-y-6">
        <PasswordForm />
        {user && <DeleteAccountButton userId={user.id} />}
      </div>
    </SettingsShell>
  );
}
