"use client";

import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileForm } from "../profile-form";
import { SettingsShell } from "../components/settings-shell";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { toast } from "@/components/ui/use-toast";
import { useEffect, useRef, useState } from "react";
import { isProfileComplete } from "@/actions/profile-actions";
import { useSearchParams } from "next/navigation";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const {
    profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfile(user?.id);
  const searchParams = useSearchParams();
  const hasShownToast = useRef(false);
  const [profileIncomplete, setProfileIncomplete] = useState(false);

  useEffect(() => {
    async function checkProfileCompleteness() {
      if (!user?.id || profileLoading) return;

      const { isComplete } = await isProfileComplete(user.id);
      const hasErrorParam = searchParams.get("error") === "profile_incomplete";
      const incomplete = !isComplete || hasErrorParam;
      setProfileIncomplete(incomplete);

      if (incomplete && !hasShownToast.current) {
        hasShownToast.current = true;
        toast({
          title: "Profile Incomplete",
          description:
            "You need to complete your profile (full name, bio, and profile picture) to list causes.",
          variant: "destructive",
        });
      }
    }

    checkProfileCompleteness();
  }, [user, searchParams, profileLoading]);

  useEffect(() => {
    if (profileError) {
      toast({
        title: "Error",
        description: profileError,
        variant: "destructive",
      });
    }
  }, [profileError]);

  if (profileLoading) {
    return (
      <SettingsShell isOrganization={false}>
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-3 h-5 w-80" />
        <Skeleton className="mt-8 h-[420px] w-full rounded-xl" />
      </SettingsShell>
    );
  }

  if (profileError) {
    return (
      <SettingsShell>
        <p className="text-sm text-ink/60">
          An error occurred. Please refresh the page.
        </p>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell isOrganization={profile?.account_type === "organization"}>
      {profileIncomplete ? (
        <CalloutBanner
          className="mb-6"
          variant="gold"
          title="Your profile is incomplete"
          description="Add your full name, bio, and photo before you can list causes."
        />
      ) : null}
      {profile && user && (
        <ProfileForm
          profile={{
            full_name: profile.full_name,
            email: profile.email ?? "",
            phone: profile.phone,
            profile_photo: profile.profile_photo,
            bio: profile.bio,
            username: profile.username,
            display_name: profile.display_name,
            location: profile.location,
            donation_preference: profile.donation_preference,
            account_type: profile.account_type,
            interests: profile.interests,
            created_at: profile.created_at,
            causes_count: profile.causes_count,
          }}
          user={{
            id: user.id,
            email: user.email ?? "",
          }}
        />
      )}
    </SettingsShell>
  );
}
