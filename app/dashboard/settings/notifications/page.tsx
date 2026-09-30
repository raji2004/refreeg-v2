import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getCachedProfile } from "@/lib/profile-cache";
import { NotificationsForm } from "../notifications-form";
import { SettingsShell } from "../components/settings-shell";

export default async function NotificationsSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const profile = await getCachedProfile(session.user.id).catch(() => null);

  return (
    <SettingsShell isOrganization={profile?.account_type === "organization"}>
      <NotificationsForm />
    </SettingsShell>
  );
}
