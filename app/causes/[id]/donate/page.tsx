import { notFound } from "next/navigation";
import { getCause } from "@/actions/cause-actions";
import { getCurrentUser } from "@/actions/auth-actions";
import { getProfile } from "@/actions/profile-actions";
import QuickDonateForm from "./QuickDonateForm";
import type { Metadata } from "next";

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

  const user = await getCurrentUser();
  const profile = user ? await getProfile(user.id) : null;

  return (
    <QuickDonateForm
      causeId={cause.id}
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
