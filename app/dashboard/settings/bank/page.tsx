import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getCachedProfile } from "@/lib/profile-cache";
import { BankDetailsForm } from "../bank-details-form";
import { SettingsShell } from "../components/settings-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function BankSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const profile = await getCachedProfile(session.user.id).catch(() => null);

  if (!profile) {
    return (
      <SettingsShell>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            We couldn&apos;t load your bank details. Please refresh the page.
          </AlertDescription>
        </Alert>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell>
      <BankDetailsForm profile={profile} user={{ id: session.user.id }} />
    </SettingsShell>
  );
}
