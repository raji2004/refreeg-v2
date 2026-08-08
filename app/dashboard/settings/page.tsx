"use client";

import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsItem } from "./components/settings-item";
import { User, CreditCard, Shield, Bell, Trash2, Building2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const {
    profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfile(user?.id);

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{profileError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="space-y-2">
        <SettingsItem
          title="Profile"
          description="Update your personal information and profile details"
          href="/dashboard/settings/profile"
          icon={<User className="h-5 w-5" />}
        />
        {profile?.account_type === "organization" && (
          <SettingsItem
            title="Organization"
            description="Manage workspace details, branding, preferences, and team access"
            href="/dashboard/settings/organization"
            icon={<Building2 className="h-5 w-5" />}
          />
        )}
        <SettingsItem
          title="Bank Details"
          description="Manage your bank account for receiving donations"
          href="/dashboard/settings/bank"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <SettingsItem
          title="KYC Verification"
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
          title="Account Management"
          description="Delete your account and manage account settings"
          href="/dashboard/settings/account"
          icon={<Trash2 className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}
