import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getCachedProfile } from "@/lib/profile-cache";
import { ProfileForm } from "../profile-form";
import { SettingsShell } from "../components/settings-shell";
import { ProfileIncompleteToast } from "../components/profile-incomplete-toast";
import { CalloutBanner } from "@/components/ui/callout-banner";

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const userId = session.user.id;

  const [profile, params] = await Promise.all([
    getCachedProfile(userId).catch(() => null),
    searchParams,
  ]);

  if (!profile) {
    return (
      <SettingsShell>
        <p className="text-sm text-ink/60">
          An error occurred. Please refresh the page.
        </p>
      </SettingsShell>
    );
  }

  const isComplete = !!profile.full_name?.trim() && !!profile.profile_photo;
  const profileIncomplete =
    !isComplete || params.error === "profile_incomplete";

  return (
    <SettingsShell isOrganization={profile.account_type === "organization"}>
      {profileIncomplete ? (
        <>
          <ProfileIncompleteToast />
          <CalloutBanner
            className="mb-6"
            variant="gold"
            title="Your profile is incomplete"
            description="Add your full name, bio, and photo before you can list causes."
          />
        </>
      ) : null}
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
          id: userId,
          email: session.user.email ?? "",
        }}
      />
    </SettingsShell>
  );
}
