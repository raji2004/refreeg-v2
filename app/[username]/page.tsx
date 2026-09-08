import { getProfile, getProfileByUsername } from "@/actions/profile-actions";
import { getUserCauses } from "@/actions/cause-actions";
import { listUserDonations } from "@/actions/donation-actions";
import { getUserPetitions } from "@/actions/petition-actions";
import { getCurrentUser } from "@/actions/auth-actions";
import { getOrganizationPublicProfile } from "@/actions/organization-actions";
import PublicProfile from "@/components/PublicProfile";
import OrganizationPublicProfile from "@/components/organization-public-profile";
import { notFound } from "next/navigation";

type PageParams = {
  username: string;
};

type SearchParams = {
  tab?: string;
  view?: string;
};

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { username } = await params;
  const { view } = await searchParams;

  const currentUser = await getCurrentUser();

  const profile = await getProfileByUsername(username);
  if (!profile) {
    notFound();
  }

  const userId = profile.id;
  const isOwner = currentUser?.id === userId;

  const [causes, petitions] = await Promise.all([
    getUserCauses(userId).then((items) =>
      items.filter((cause) => cause.status === "approved"),
    ),
    getUserPetitions(userId).then((items) =>
      items.filter((petition) => petition.status === "approved"),
    ),
  ]);

  if (profile.account_type === "organization" && view !== "personal") {
    const organization = await getOrganizationPublicProfile(userId);

    if (organization) {
      if (!organization.publicProfile && !isOwner) {
        notFound();
      }

      return (
        <div className="relative">
          <OrganizationPublicProfile
            organization={organization}
            profile={profile}
            causes={causes}
            petitions={petitions}
            userId={userId}
            isOwner={isOwner}
          />
        </div>
      );
    }
  }

  const donations = await listUserDonations(userId).then((items) =>
    items.filter(
      (donation) => (donation.cause as any)?.status === "approved",
    ),
  );

  return (
    <div className="relative">
      <PublicProfile
        profile={profile}
        causes={causes}
        donations={donations}
        petitions={petitions}
        userId={userId}
        isOwner={isOwner}
      />
    </div>
  );
}
