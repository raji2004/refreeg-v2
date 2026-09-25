import type React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session-user";
import { requireKycAndProfile } from "@/lib/auth/require-kyc";

export default async function CreatePetitionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const redirectPath = await requireKycAndProfile(user.id);
  if (redirectPath) {
    redirect(redirectPath);
  }

  return <>{children}</>;
}
