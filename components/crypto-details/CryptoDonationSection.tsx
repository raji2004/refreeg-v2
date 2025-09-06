"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetaMaskDonationButton } from "./MetaMaskDonationButton";
import { SolanaDonationButton } from "./SolanaDonationButton";

interface CryptoDonationSectionProps {
  causeId: string;
  metamaskAddress?: string | null;
  solanaAddress?: string | null;
}

export function CryptoDonationSection({
  causeId,
  metamaskAddress,
  solanaAddress,
}: CryptoDonationSectionProps) {
  const router = useRouter();

  const handleDonationSuccess = (amountInNaira: number) => {
    // Refresh the page to update the progress bar and donor count
    router.refresh();
  };
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Select your preferred wallet</h3>
        <p className="text-sm text-gray-600">
          Choose how you'd like to make your crypto donation
        </p>
      </div>

      <Tabs defaultValue="metamask" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="metamask">MetaMask</TabsTrigger>
          <TabsTrigger value="solana">Phantom (Solana)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="metamask" className="mt-4">
          <MetaMaskDonationButton
            causeId={causeId}
            recipientAddress={metamaskAddress || ""}
            onDonationSuccess={handleDonationSuccess}
          />
        </TabsContent>
        
        <TabsContent value="solana" className="mt-4">
          <SolanaDonationButton
            causeId={causeId}
            recipientAddress={solanaAddress || ""}
            onDonationSuccess={handleDonationSuccess}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
