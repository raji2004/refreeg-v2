"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetaMaskDonationButton } from "./MetaMaskDonationButton";
import { SolanaDonationButton } from "./SolanaDonationButton";
import { useRouter } from "next/navigation";
import { Wallet, Zap } from "lucide-react";

interface CryptoDonationSectionProps {
  causeId: string;
}

export function CryptoDonationSection({ causeId }: CryptoDonationSectionProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("metamask");

  const handleDonationSuccess = (amountInNaira: number) => {
    // Refresh the page to update the progress bar and donor count
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Donate with Crypto
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select your preferred wallet to make a donation
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="metamask" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              MetaMask
            </TabsTrigger>
            <TabsTrigger value="solana" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Solana
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="metamask" className="mt-4">
            <MetaMaskDonationButton
              causeId={causeId}
              onDonationSuccess={handleDonationSuccess}
            />
          </TabsContent>
          
          <TabsContent value="solana" className="mt-4">
            <SolanaDonationButton
              causeId={causeId}
              onDonationSuccess={handleDonationSuccess}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
