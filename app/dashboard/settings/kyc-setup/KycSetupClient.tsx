"use client";

import dynamic from "next/dynamic";
import NavigationLoader from "@/components/NavigationLoader";
import type { KycVerification } from "@/types/kyc-types";

const KycSetupForm = dynamic(() => import("./KycSetupForm"), {
  loading: () => {
    console.log("[KYC Setup] Loading client form...");
    return <NavigationLoader />;
  },
  ssr: false,
});

type KycSetupClientProps = {
  userId: string;
  rejectedKyc: KycVerification | null;
  kycFetchError: string | null;
};

export default function KycSetupClient(props: KycSetupClientProps) {
  console.log("[KYC Setup] Client wrapper received props:", props);
  return <KycSetupForm {...props} />;
}
