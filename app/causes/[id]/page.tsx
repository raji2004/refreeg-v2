import { notFound, redirect } from "next/navigation";
import { getCause } from "@/actions/cause-actions";
import { auth } from "@/lib/auth/auth";
import { getProfile } from "@/actions/profile-actions";
import { listDonationsForCause } from "@/actions/donation-actions";
import { listCommentsForCause } from "@/actions/comment-actions";
import { getApprovedProofUpdates } from "@/actions/proof-update-actions";
import CampaignQualityLab from "@/app/campaign/_components/campaign-quality-lab";
import { causePublicPath } from "@/lib/causes/slug";
import { CausePausedNotice } from "@/components/cause-paused-notice";
import { isAdminOrManager } from "@/actions/role-actions";

import { Metadata } from "next";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cause = await getCause(id);

  if (!cause) {
    return {
      title: "Cause Not Found",
    };
  }

  return {
    title: cause.title,
    description: cause.description?.substring(0, 160),
    openGraph: {
      title: cause.title,
      description: cause.description?.substring(0, 160),
      images: cause.image ? [{ url: cause.image }] : [],
    },
  };
}

export default async function CauseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cause = await getCause(id);

  if (!cause) {
    notFound();
  }

  if (UUID_REGEX.test(id) && cause.slug) {
    redirect(causePublicPath(cause));
  }

  const [donors, comments, session, proofUpdates] = await Promise.all([
    listDonationsForCause(cause.id),
    listCommentsForCause(cause.id),
    auth(),
    getApprovedProofUpdates(cause.id),
  ]);

  const user = session?.user;

  const isOwner = user?.id === cause.user_id;
  if (cause.paused && !isOwner) {
    const isAdmin = user?.id ? await isAdminOrManager(user.id as string) : false;
    if (!isAdmin) {
      return <CausePausedNotice title={cause.title} />;
    }
  }

  const [myprofile, creatorProfile] = await Promise.all([
    user ? getProfile(user.id as string) : Promise.resolve(undefined),
    getProfile(cause.user_id),
  ]);

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
      proofUpdates={proofUpdates}
    />
  );
}
