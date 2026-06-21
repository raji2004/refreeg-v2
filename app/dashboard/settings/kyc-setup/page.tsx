import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth-actions";
import { getVerificationStatus } from "@/actions/kyc-actions";
import KycSetupClient from "./KycSetupClient";

export default async function KycSetupPage() {
  console.log("[KYC Setup] Server page loading...");

  const user = await getCurrentUser();
  console.log(
    "[KYC Setup] Auth user:",
    user ? { id: user.id, email: user.email } : null,
  );

  if (!user) {
    console.log("[KYC Setup] No authenticated user, redirecting to sign in");
    redirect("/auth/signin");
  }

  const { status, error: kycError } = await getVerificationStatus(user.id);
  console.log("[KYC Setup] Verification status fetch:", {
    userId: user.id,
    status,
    kycError,
  });

  const rejectedKyc = status?.status === "rejected" ? status : null;

  return (
    <KycSetupClient
      userId={user.id}
      rejectedKyc={rejectedKyc}
      kycFetchError={kycError}
    />
  );
}
