"use client";

import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useKyc } from "@/hooks/use-kyc";
import { Skeleton } from "@/components/ui/skeleton";
import { KycTab } from "../kyc-tab";
import { SettingsShell } from "../components/settings-shell";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useEffect, useRef, Suspense } from "react";
import { getVerificationStatus } from "@/actions/kyc-actions";
import { useRouter, useSearchParams } from "next/navigation";

function KycSettingsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfile(user?.id);
  const { isLoading: isKycLoading } = useKyc(user?.id);
  const hasShownToast = useRef(false);

  useEffect(() => {
    async function checkKycStatus() {
      if (!user?.id || profileLoading || isKycLoading) return;

      const kycResult = await getVerificationStatus(user.id);
      const kycStatus = (kycResult?.status ?? undefined) as
        | "pending"
        | "approved"
        | "rejected"
        | undefined;

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
  }, [user, searchParams, router, profileLoading, isKycLoading]);

  useEffect(() => {
    if (profileError) {
      toast({
        title: "Error",
        description: profileError,
        variant: "destructive",
      });
    }
  }, [profileError]);

  if (profileLoading || isKycLoading) {
    return (
      <SettingsShell>
        <Skeleton className="h-[400px] w-full" />
      </SettingsShell>
    );
  }

  if (profileError) {
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
      {user ? (
        <KycTab profile={profile as any} user={user} />
      ) : (
        <div className="text-sm text-muted-foreground">
          Please log in to view KYC status.
        </div>
      )}
    </SettingsShell>
  );
}

export default function KycSettingsPage() {
  return (
    <Suspense
      fallback={
        <SettingsShell>
          <Skeleton className="h-[400px] w-full" />
        </SettingsShell>
      }
    >
      <KycSettingsContent />
    </Suspense>
  );
}
