import type React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth-actions";
import { requireKycAndProfile } from "@/lib/auth/require-kyc";

export default async function CreateCauseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const redirectPath = await requireKycAndProfile(user.id);
  if (redirectPath) {
    redirect(redirectPath);
  }

  return <>{children}</>;
}
