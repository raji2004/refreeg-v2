"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KycTab } from "../kyc-tab";
import { SettingsShell } from "../components/settings-shell";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getVerificationStatus } from "@/actions/kyc-actions";
import type { Profile } from "@/types";

interface KycSettingsContentProps {
  profile: Profile | null;
  user: { id: string; email: string };
}

export function KycSettingsContent({ profile, user }: KycSettingsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasShownToast = useRef(false);

  useEffect(() => {
    async function checkKycStatus() {
      const kycResult = await getVerificationStatus(user.id);
      const kycStatus = (kycResult?.status ?? undefined) as
        "pending" | "approved" | "rejected" | undefined;

      if (searchParams.get("error") === "kyc_required") {
        if (!hasShownToast.current) {
          hasShownToast.current = true;
          toast({
            title: "KYC Verification Required",
            description:
              "Complete your KYC verification to list causes and access all features.",
            variant: "destructive",
            action: (
              <ToastAction
                altText="Set up KYC"
                onClick={() => router.push("/dashboard/settings/kyc-setup")}
              >
                Set up KYC
              </ToastAction>
            ),
          });
        }
      } else if (
        kycStatus === "pending" ||
        searchParams.get("error") === "kyc_pending"
      ) {
        if (!hasShownToast.current) {
          hasShownToast.current = true;
          toast({
            title: "KYC Under Review",
            description:
              "Your KYC submission is pending review. You will be notified via email once it is approved.",
            variant: "default",
          });
        }
      } else if (
        kycStatus === "rejected" ||
        searchParams.get("error") === "kyc_rejected"
      ) {
        if (!hasShownToast.current) {
          hasShownToast.current = true;
          toast({
            title: "KYC Rejected",
            description:
              "Your KYC submission was rejected. Please review the requirements and resubmit.",
            variant: "destructive",
            action: (
              <ToastAction
                altText="Resubmit KYC"
                onClick={() => router.push("/dashboard/settings/kyc-setup")}
              >
                Resubmit
              </ToastAction>
            ),
          });
        }
      }
    }

    checkKycStatus();
  }, [user.id, searchParams, router]);

  if (!profile) {
    return (
      <SettingsShell>
        <div className="text-sm text-muted-foreground">
          An error occurred. Please refresh the page.
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell>
      <KycTab profile={profile} user={user} />
    </SettingsShell>
  );
}
