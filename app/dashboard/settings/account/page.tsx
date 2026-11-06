import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getCachedProfile } from "@/lib/profile-cache";
import { DeleteAccountButton } from "../delete-account-button";
import { PasswordForm } from "../password-form";
import { SettingsShell } from "../components/settings-shell";

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const profile = await getCachedProfile(session.user.id).catch(() => null);

  return (
    <SettingsShell
      isOrganization={profile?.account_type === "organization"}
      isVerified={profile?.is_verified}
    >
      <div className="space-y-6">
        <PasswordForm />
        <DeleteAccountButton userId={session.user.id} />
      </div>
    </SettingsShell>
  );
}
