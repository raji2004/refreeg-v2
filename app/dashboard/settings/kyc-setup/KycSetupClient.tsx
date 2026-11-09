"use client";

import dynamic from "next/dynamic";
import NavigationLoader from "@/components/NavigationLoader";
import type { KycVerification } from "@/types/kyc-types";

const InHouseKycWizard = dynamic(() => import("./InHouseKycWizard"), {
  loading: () => <NavigationLoader />,
  ssr: false,
});

type KycSetupClientProps = {
  userId: string;
  rejectedKyc: KycVerification | null;
  kycFetchError: string | null;
  currentKyc: KycVerification | null;
};

export default function KycSetupClient(props: KycSetupClientProps) {
  return (
    <div data-testid="kyc-setup-container" data-userid={props.userId}>
      <InHouseKycWizard userId={props.userId} />
    </div>
  );
}
