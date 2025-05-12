"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectWalletButton } from "@/components/crypto-details/ConnectWalletButton";
import { DisconnectWalletButton } from "@/components/crypto-details/DisconnectWalletButton";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface CryptoWallet {
  id: number;
  address: string;
  network: string;
}

export default function CryptoDetailsForm() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const fetchWallet = async () => {
      setIsLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("polygon_wallet")
          .eq("id", user.id)
          .single();

        // Handle both string and object formats
        if (profile?.polygon_wallet) {
          const address =
            typeof profile.polygon_wallet === "string"
              ? profile.polygon_wallet
              : Object.values(profile.polygon_wallet).join("");
          setWalletAddress(address);
        } else {
          setWalletAddress(null);
        }
      } catch (error) {
        console.error("Error fetching wallet:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load wallet",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWallet();
  }, [supabase, toast]);

  const handleWalletConnected = async (address: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Store as a plain string
      const { error } = await supabase
        .from("profiles")
        .update({ polygon_wallet: address })
        .eq("id", user.id);

      if (error) throw error;

      setWalletAddress(address);
      toast({
        title: "Success",
        description: "Wallet connected successfully",
      });
    } catch (error) {
      console.error("Error handling wallet connection:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect wallet",
      });
    }
  };

  const handleWalletDisconnected = () => {
    setWalletAddress(null);
    toast({
      title: "Success",
      description: "Wallet disconnected successfully",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Crypto Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading wallet...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crypto Wallet</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {walletAddress ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-purple-600"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" x2="9.01" y1="9" y2="9" />
                    <line x1="15" x2="15.01" y1="9" y2="9" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Polygon Amoy</p>
                  <p className="text-sm text-muted-foreground truncate max-w-md">
                    {walletAddress}
                  </p>
                </div>
              </div>
              <DisconnectWalletButton
                walletAddress={walletAddress}
                walletNetwork="matic-amoy"
                onSuccess={handleWalletDisconnected}
              />
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No wallet connected
            </div>
          )}

          <ConnectWalletButton
            onConnected={handleWalletConnected}
            disabled={!!walletAddress}
          />
        </div>
      </CardContent>
    </Card>
  );
}