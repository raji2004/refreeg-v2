import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CampaignFlowProvider } from "./_components/campaign-flow-provider";
import { CampaignFlowShell } from "./_components/campaign-flow-shell";

export default async function CreateCausePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userId = session.user.id as string;

  // Retrieve KYC status
  const kycRecord = await prisma.kyc_verifications.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  const isVerified = kycRecord?.status === "approved";
  const kycDetails = isVerified
    ? {
        level: 2,
        confirmedAt: kycRecord?.updated_at
          ? new Date(kycRecord.updated_at).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })
          : "Recently",
      }
    : null;

  // Retrieve bank details if previously configured on user profile
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      bankName: true,
      accountNumber: true,
      accountName: true,
    },
  });

  return (
    <CampaignFlowProvider
      initialUserKyc={{
        isVerified,
        details: kycDetails,
      }}
      initialBankInfo={{
        bankName: userRecord?.bankName ?? undefined,
        accountNumber: userRecord?.accountNumber ?? undefined,
        accountName: userRecord?.accountName ?? undefined,
      }}
    >
      <CampaignFlowShell />
    </CampaignFlowProvider>
  );
}
