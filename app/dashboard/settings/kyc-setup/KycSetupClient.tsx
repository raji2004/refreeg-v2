"use client";

import dynamic from "next/dynamic";
import NavigationLoader from "@/components/NavigationLoader";
import type { KycVerification } from "@/types/kyc-types";

const DiditKycForm = dynamic(() => import("./DiditKycForm"), {
  loading: () => {
    console.log("[KYC Setup] Loading client form...");
    return <NavigationLoader />;
  },
  ssr: false,
});

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type KycSetupClientProps = {
  userId: string;
  rejectedKyc: KycVerification | null;
  kycFetchError: string | null;
  currentKyc: KycVerification | null;
};

export default function KycSetupClient(props: KycSetupClientProps) {
  const router = useRouter();

  // Poll for updates if the status is pending
  useEffect(() => {
    if (props.currentKyc?.status === "pending") {
      const interval = setInterval(() => {
        router.refresh();
      }, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [props.currentKyc?.status, router]);

  console.log("[KYC Setup] Client wrapper received props:", props);
  
  if (props.currentKyc?.status === "pending") {
    return (
      <Card className="w-full max-w-lg mx-auto mt-10">
        <CardHeader className="text-center">
          <div className="mx-auto bg-amber-100 p-4 rounded-full mb-4">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <CardTitle className="text-2xl font-montserrat">KYC Under Review</CardTitle>
          <CardDescription>
            Your identity verification is currently being reviewed by Didit.
            Please check back later or check your email for updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard" className="w-full">
            <Button className="w-full" variant="outline">Return to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (props.currentKyc?.status === "approved") {
    return (
      <Card className="w-full max-w-lg mx-auto mt-10">
        <CardHeader className="text-center">
          <div className="mx-auto bg-green-100 p-4 rounded-full mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-montserrat">KYC Approved!</CardTitle>
          <CardDescription>
            Your identity has been successfully verified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard" className="w-full">
            <Button className="w-full" variant="default">Go to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <DiditKycForm userId={props.userId} />;
}
