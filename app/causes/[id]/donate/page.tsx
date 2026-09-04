import { notFound, redirect } from "next/navigation";
import { getCause } from "@/actions/cause-actions";
import { getCurrentUser } from "@/actions/auth-actions";
import { getProfile } from "@/actions/profile-actions";
import QuickDonateForm from "./QuickDonateForm";
import type { Metadata } from "next";
import { causePublicPath } from "@/lib/causes/slug";
import { CausePausedNotice } from "@/components/cause-paused-notice";
import { isAdminOrManager } from "@/actions/role-actions";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cause = await getCause(id);
  return {
    title: cause ? `Donate to ${cause.title}` : "Donate",
    description: cause?.summary || cause?.description?.substring(0, 160),
  };
}

export default async function QuickDonatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cause = await getCause(id);
  if (!cause) notFound();

  if (UUID_REGEX.test(id) && cause.slug) {
    redirect(`${causePublicPath(cause)}/donate`);
  }

  const user = await getCurrentUser();

  if (cause.paused && user?.id !== cause.user_id) {
    const isAdmin = user?.id ? await isAdminOrManager(user.id) : false;
    if (!isAdmin) {
      return <CausePausedNotice title={cause.title} />;
    }
  }

  const profile = user ? await getProfile(user.id) : null;

  return (
    <QuickDonateForm
      causeId={cause.id}
      causeSlug={cause.slug}
      causeTitle={cause.title}
      causeImage={cause.image}
      causeMultimedia={cause.multimedia}
      goal={cause.goal}
      raised={cause.raised}
      subaccount={(cause as any).user?.sub_account_code ?? undefined}
      defaultName={profile?.full_name ?? ""}
      defaultEmail={profile?.email ?? ""}
      userId={user?.id}
    />
  );
}
