// components/profile/PublicProfile.tsx
import BackButton from "@/components/ui/BackButton";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs from "./ProfileTabs";
import { CauseCard, DonationCard, EmptyState } from "./ProfileCards";

type ProfileProps = {
  profile: any;
  causes: any[];
  donations: any[];
  userId: string;
  activeTab: string;
  isOwner: boolean;
};

export default function PublicProfile({
  profile,
  causes,
  donations,
  userId,
  activeTab,
  isOwner,
}: ProfileProps) {
  const donationsCount = donations.length;

  // Tab configuration
  const tabs = [
    {
      id: "causes",
      label: "Causes",
      count: causes.length,
      content:
        causes.length === 0 ? (
          <EmptyState
            title="No Causes Yet"
            description={`It looks like ${
              profile.full_name?.split(" ")[0] || "this user"
            } hasn't started a cause yet. Stay tuned for their first impact story!`}
            cta="Explore causes on refreeg"
            ctaLink="/causes"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {causes.map((cause) => (
              <CauseCard key={cause.id} cause={cause} />
            ))}
          </div>
        ),
    },
    {
      id: "donations",
      label: "Donations",
      count: donationsCount,
      content:
        donationsCount === 0 ? (
          <EmptyState
            title="No Donations Yet"
            description={`${
              profile.full_name?.split(" ")[0] || "This user"
            } hasn't donated to any causes yet.`}
            cta="Explore causes on refreeg"
            ctaLink="/causes"
          />
        ) : (
          <div className="space-y-4">
            {donations.map((donation) => (
              <DonationCard key={donation.id} donation={donation} />
            ))}
          </div>
        ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <BackButton />

      {/* Profile Header */}
      <ProfileHeader
        profile={profile}
        causesCount={causes.length}
        donationsCount={donationsCount}
      />

      {/* Tab Navigation */}
      <ProfileTabs tabs={tabs} userId={userId} activeTab={activeTab} />

      {/* Tab Content */}
      <div className="mt-6">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>
    </div>
  );
}
