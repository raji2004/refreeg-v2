"use client";

import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileForm } from "../profile-form";
import { SettingsShell } from "../components/settings-shell";
import { toast } from "@/components/ui/use-toast";
import { useEffect, useRef } from "react";
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

  useEffect(() => {
    async function checkProfileCompleteness() {
      if (!user?.id || profileLoading) return;

      const { isComplete } = await isProfileComplete(user.id);
      const hasErrorParam = searchParams.get("error") === "profile_incomplete";

      if ((!isComplete || hasErrorParam) && !hasShownToast.current) {
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
      <SettingsShell>
        <Skeleton className="h-[400px] w-full" />
      </SettingsShell>
    );
  }

  if (profileError) {
    return (
      <SettingsShell>
        <div className="text-sm text-muted-foreground">
          An error occurred. Please refresh the page.
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell>
      {profile && user && (
        <ProfileForm
          profile={{
            full_name: profile.full_name,
            email: profile.email ?? "",
            phone: profile.phone,
            profile_photo: profile.profile_photo,
            bio: profile.bio,
            username: profile.username,
            account_type: profile.account_type,
            twitter_url: profile.twitter_url,
            facebook_url: profile.facebook_url,
            instagram_url: profile.instagram_url,
            linkedin_url: profile.linkedin_url,
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
