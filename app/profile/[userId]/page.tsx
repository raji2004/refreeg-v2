// app/profile/[userId]/page.tsx
import { getProfile, getUserCauses, listUserDonations } from "@/actions";
import { getCurrentUser } from "@/actions/auth-actions";
import BackButton from "@/components/ui/BackButton";
import PublicProfile from "@/components/PublicProfile";

// Type definitions for our parameters
type PageParams = {
  userId: string;
};

type SearchParams = {
  tab?: string;
};

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  // Properly handle the params as recommended by Next.js
  const { userId } = params;
  const { tab: tabParam } = searchParams;

  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.id === userId;
  const activeTab = tabParam || "causes";

  // Fetch data
  const profile = await getProfile(userId);
  if (!profile) {
    return <div className="text-center py-12">User not found</div>;
  }

  const causes = await getUserCauses(userId);
  const donations = await listUserDonations(userId);

  return (
    <PublicProfile
      profile={profile}
      causes={causes}
      donations={donations}
      userId={userId}
      activeTab={activeTab}
      isOwner={isOwner}
    />
  );
}
