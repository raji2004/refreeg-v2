import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/users/auth-actions";
import { getVerificationStatus } from "@/actions/users/kyc-actions";
import KycSetupClient from "./KycSetupClient";

export default async function KycSetupPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const { status, error: kycError } = await getVerificationStatus(user.id);

  const rejectedKyc = status?.status === "rejected" ? status : null;

  return (
    <KycSetupClient
      userId={user.id}
      rejectedKyc={rejectedKyc}
      kycFetchError={kycError}
      currentKyc={status}
    />
  );
}
