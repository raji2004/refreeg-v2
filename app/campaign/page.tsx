import { notFound } from "next/navigation";
import { getCause } from "@/actions/cause-actions";
import { getSessionUser } from "@/lib/auth/session-user";
import { getProfile } from "@/actions/profile-actions";
import { listDonationsForCause } from "@/actions/donation-actions";
import { listCommentsForCause } from "@/actions/comment-actions";
import CampaignQualityLab from "@/app/campaign/_components/campaign-quality-lab";

export default async function CampaignQualityTestPage({
  searchParams,
}: {
  searchParams?: { id?: string };
}) {
  const causeId = searchParams?.id;
  if (!causeId) {
    notFound();
  }

  const cause = await getCause(causeId);
  if (!cause) {
    notFound();
  }

  const donors = await listDonationsForCause(cause.id);
  const comments = await listCommentsForCause(cause.id);
  const user = await getSessionUser();
  const myprofile = user ? await getProfile(user.id) : undefined;
  const creatorProfile = await getProfile(cause.user_id);

  const profile = {
    email: myprofile?.email || "",
    name: myprofile?.full_name || "",
    id: myprofile?.id || "",
    subaccount: myprofile?.sub_account_code || "",
  };

  return (
    <CampaignQualityLab
      cause={cause}
      donors={donors}
      comments={comments}
      profile={profile}
      creatorHasWallet={!!creatorProfile?.solana_wallet}
      currentUserId={user?.id}
    />
  );
}
