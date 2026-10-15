import { Building2 } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getCachedProfile } from "@/lib/profile-cache";
import { getOrganizationWorkspace } from "@/actions/organization-actions";
import { SettingsShell } from "../components/settings-shell";
import { OrganizationSettingsForm } from "./organization-settings-form";

export default async function OrganizationSettingsPage() {
  const [session, result] = await Promise.all([
    auth(),
    getOrganizationWorkspace(),
  ]);

  const profile = session?.user?.id
    ? await getCachedProfile(session.user.id).catch(() => null)
    : null;

  return (
    <SettingsShell isOrganization isVerified={profile?.is_verified}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-blue-50 p-2 text-blue-700">
            <Building2 className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organization</h1>
            <p className="text-muted-foreground">
              Manage workspace details, preferences, and team access.
            </p>
          </div>
        </div>
      </div>

      {result.success ? (
        <OrganizationSettingsForm initialWorkspace={result.workspace} />
      ) : (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {result.error}
        </div>
      )}
    </SettingsShell>
  );
}
