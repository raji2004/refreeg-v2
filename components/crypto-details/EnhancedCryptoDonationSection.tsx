"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetaMaskDonationButton } from "./MetaMaskDonationButton";
import { SolanaDonationButton } from "./SolanaDonationButton";
import { LiveStreamingStatus } from "@/components/streaming/LiveStreamingStatus";
import { LiveCryptoStreamingCounter } from "@/components/streaming/LiveCryptoStreamingCounter";
import { AutoProcessor } from "@/components/streaming/AutoProcessor";
import { getLiveCryptoStreamingStatus } from "@/actions/crypto-streaming-actions";
import { Droplets, Activity } from "lucide-react";

interface EnhancedCryptoDonationSectionProps {
  causeId: string;
  metamaskAddress?: string | null;
  solanaAddress?: string | null;
}

export function EnhancedCryptoDonationSection({
  causeId,
  metamaskAddress,
  solanaAddress,
}: EnhancedCryptoDonationSectionProps) {
  const router = useRouter();
  const [isStreamingEnabled, setIsStreamingEnabled] = useState(false);
  const [streamingDuration, setStreamingDuration] = useState("7");
  const [streamingInterval, setStreamingInterval] = useState("1");
  const [hasActiveStreams, setHasActiveStreams] = useState(false);

  // Check for active streams
  useEffect(() => {
    const checkActiveStreams = async () => {
      try {
        const status = await getLiveCryptoStreamingStatus(causeId);
        setHasActiveStreams(status && status.active_streams_count > 0);
      } catch (error) {
        console.error("Error checking active streams:", error);
      }
    };

    checkActiveStreams();
    // Check every 5 seconds
    const interval = setInterval(checkActiveStreams, 5000);
    return () => clearInterval(interval);
  }, [causeId]);

  const handleDonationSuccess = (amountInNaira: number) => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Live Streaming Status - Show when there are active streams */}
      {hasActiveStreams && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Activity className="h-5 w-5 animate-pulse" />
              Live Crypto Streaming Active!
            </CardTitle>
            <CardDescription className="text-blue-700">
              Crypto tokens are flowing to this cause in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LiveCryptoStreamingCounter causeId={causeId} />
            <AutoProcessor onProcessed={(count) => {
              if (count > 0) {
                console.log(`Processed ${count} crypto streams`);
              }
            }} />
          </CardContent>
        </Card>
      )}

      {/* Crypto Donation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Crypto Donation
          </CardTitle>
          <CardDescription>
            Donate with crypto tokens to support this cause
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Streaming Options */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="streaming-enabled"
                checked={isStreamingEnabled}
                onCheckedChange={(checked) => setIsStreamingEnabled(checked as boolean)}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="streaming-enabled" className="text-sm font-medium">
                Stream tokens over time (instead of one-time donation)
              </Label>
            </div>
            
            {isStreamingEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                <div className="space-y-2">
                  <Label htmlFor="streaming-duration">Stream Duration</Label>
                  <Select value={streamingDuration} onValueChange={setStreamingDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">1 Week</SelectItem>
                      <SelectItem value="14">2 Weeks</SelectItem>
                      <SelectItem value="30">1 Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="streaming-interval">Stream Interval</Label>
                  <Select value={streamingInterval} onValueChange={setStreamingInterval}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Every Second</SelectItem>
                      <SelectItem value="5">Every 5 Seconds</SelectItem>
                      <SelectItem value="10">Every 10 Seconds</SelectItem>
                      <SelectItem value="60">Every Minute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Selection */}
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
                  isStreamingEnabled={isStreamingEnabled}
                  streamingDuration={parseInt(streamingDuration)}
                  streamingInterval={parseInt(streamingInterval)}
                />
              </TabsContent>
              
              <TabsContent value="solana" className="mt-4">
                <SolanaDonationButton
                  causeId={causeId}
                  recipientAddress={solanaAddress || ""}
                  onDonationSuccess={handleDonationSuccess}
                  isStreamingEnabled={isStreamingEnabled}
                  streamingDuration={parseInt(streamingDuration)}
                  streamingInterval={parseInt(streamingInterval)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
