import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getCachedProfile } from "@/lib/profile-cache";
import { SettingsItem } from "./components/settings-item";
import { SettingsNav } from "./components/settings-nav";
import {
  User,
  CreditCard,
  Shield,
  Bell,
  Trash2,
  Building2,
} from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const profile = await getCachedProfile(session.user.id).catch(() => null);

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">
          Settings
        </h1>
        <p className="text-sm text-destructive">
          We couldn&apos;t load your settings. Please refresh the page.
        </p>
      </div>
    );
  }

  const isOrganization = profile.account_type === "organization";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-fraunces text-3xl font-semibold text-ink sm:text-4xl">
          Settings
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="hidden lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
        <SettingsNav isOrganization={isOrganization} />
        <div className="rounded-xl border-2 border-ink/10 bg-white p-6">
          <p className="text-sm text-ink/60">
            Choose a section from the left to update your profile, payments,
            notifications, or verification.
          </p>
        </div>
      </div>

      <div className="space-y-2 lg:hidden">
        <SettingsItem
          title="Profile"
          description="Update your personal information and how you appear when you give"
          href="/dashboard/settings/profile"
          icon={<User className="h-5 w-5" />}
        />
        {isOrganization && (
          <SettingsItem
            title="Organization"
            description="Manage workspace details, branding, preferences, and team access"
            href="/dashboard/settings/organization"
            icon={<Building2 className="h-5 w-5" />}
          />
        )}
        <SettingsItem
          title="Payments"
          description="Manage your bank account for receiving donations"
          href="/dashboard/settings/bank"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <SettingsItem
          title="Verification"
          description="Complete identity verification to list causes"
          href="/dashboard/settings/kyc"
          icon={<Shield className="h-5 w-5" />}
        />
        <SettingsItem
          title="Notifications"
          description="Configure your notification preferences"
          href="/dashboard/settings/notifications"
          icon={<Bell className="h-5 w-5" />}
        />
        <SettingsItem
          title="Security"
          description="Password and account security"
          href="/dashboard/settings/account"
          icon={<Trash2 className="h-5 w-5" />}
        />
        <SettingsItem
          title="Close account"
          description="Permanently delete your account"
          href="/dashboard/settings/account"
          icon={<Trash2 className="h-5 w-5" />}
          destructive
        />
      </div>
    </div>
  );
}
