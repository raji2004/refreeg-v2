import { notFound } from "next/navigation";
import { getCause } from "@/actions/cause-actions";
import { getSessionUser } from "@/lib/auth/session-user";
import { getProfile } from "@/actions/profile-actions";
import PledgeScreen from "@/app/campaign/_components/pledge-screen";

export default async function CampaignQualityPledgePage({
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

  const user = await getSessionUser();
  const myprofile = user ? await getProfile(user.id) : undefined;

  const profile = {
    email: myprofile?.email || "",
    name: myprofile?.full_name || "",
    id: myprofile?.id || "",
    subaccount: myprofile?.sub_account_code || "",
  };

  return <PledgeScreen cause={cause} profile={profile} />;
}
