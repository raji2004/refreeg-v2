import type React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session-user";
import { requireKycAndProfile } from "@/lib/auth/require-kyc";

export default async function CreateCauseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // Allow creators to enter and draft their campaign freely.
  // Identity (Didit KYC) & profile verification is seamlessly checked in Step 6 (Proof & Verification).
  return <>{children}</>;
}
