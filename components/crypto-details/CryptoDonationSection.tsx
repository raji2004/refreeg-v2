"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetaMaskDonationButton } from "./MetaMaskDonationButton";
import { SolanaDonationButton } from "./SolanaDonationButton";

interface CryptoDonationSectionProps {
  causeId: string;
  recipientAddress: string;
  onDonationSuccess?: (amountInNaira: number) => void;
}

export function CryptoDonationSection({
  causeId,
  recipientAddress,
  onDonationSuccess,
}: CryptoDonationSectionProps) {
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
            recipientAddress={recipientAddress}
            onDonationSuccess={onDonationSuccess}
          />
        </TabsContent>
        
        <TabsContent value="solana" className="mt-4">
          <SolanaDonationButton
            causeId={causeId}
            recipientAddress={recipientAddress}
            onDonationSuccess={onDonationSuccess}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
