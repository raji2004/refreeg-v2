import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getCachedProfile } from "@/lib/profile-cache";
import { prisma } from "@/lib/prisma";
import { BankDetailsForm } from "../bank-details-form";
import { SettingsShell } from "../components/settings-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function BankSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [profile, liveCampaignCount] = await Promise.all([
    getCachedProfile(session.user.id).catch(() => null),
    prisma.cause.count({
      where: {
        userId: session.user.id,
        status: { in: ["approved", "pending"] },
      },
    }),
  ]);

  if (!profile) {
    return (
      <SettingsShell>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            We couldn&apos;t load your bank account. Please refresh the page.
          </AlertDescription>
        </Alert>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell
      isOrganization={profile.account_type === "organization"}
      isVerified={profile.is_verified}
    >
      <BankDetailsForm
        profile={{
          account_number: profile.account_number,
          bank_name: profile.bank_name,
          account_name: profile.account_name,
          sub_account_code: profile.sub_account_code,
        }}
        user={{
          id: session.user.id,
          email: profile.email ?? session.user.email ?? "",
        }}
        hasLiveCampaigns={liveCampaignCount > 0}
      />
    </SettingsShell>
  );
}
