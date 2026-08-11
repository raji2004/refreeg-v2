import { notFound, redirect } from "next/navigation";
import { getCause } from "@/actions/cause-actions";
import { getCurrentUser } from "@/actions/auth-actions";
import { getProfile } from "@/actions/profile-actions";
import PledgeScreen from "@/app/campaign/_components/pledge-screen";
import { causePublicPath } from "@/lib/causes/slug";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CausePledgePage({
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
    redirect(`${causePublicPath(cause)}/pledge`);
  }

  const user = await getCurrentUser();
  const myprofile = user ? await getProfile(user.id) : undefined;

  const profile = {
    email: myprofile?.email || "",
    name: myprofile?.full_name || "",
    id: myprofile?.id || "",
    subaccount: myprofile?.sub_account_code || "",
  };

  return <PledgeScreen cause={cause} profile={profile} />;
}
