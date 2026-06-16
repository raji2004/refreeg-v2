"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectSolanaWalletButton } from "@/components/crypto-details/ConnectSolanaWalletButton";
import { DisconnectSolanaWalletButton } from "@/components/crypto-details/DisconnectSolanaWalletButton";
import { useToast } from "@/components/ui/use-toast";
import { useAuthContext } from "@/components/auth-provider";
import { getSolanaWallet } from "@/actions/profile-actions";

export default function SolanaWalletForm() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuthContext();

  useEffect(() => {
    let isCancelled = false;

    const fetchWallet = async () => {
      try {
        if (isCancelled) return;

        if (!user) {
          setWalletAddress(null);
          setIsLoading(false);
          return;
        }

        if (isCancelled) return;

        setWalletAddress(await getSolanaWallet(user.id));
      } catch (error) {
        if (isCancelled) return;
        console.error("Error fetching wallet:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load wallet",
        });
        setWalletAddress(null);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchWallet();

    return () => {
      isCancelled = true;
    };
  }, [toast, user]);

  const handleWalletConnected = async (address: string) => {
    setWalletAddress(address);
    toast({
      title: "Success",
      description: "Solana wallet connected successfully",
    });
  };

  const handleWalletDisconnected = async () => {
    setWalletAddress(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Solana Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-sm text-muted-foreground">
            Loading wallet...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Solana Wallet</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {walletAddress ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="bg-purple-100 p-2 sm:p-3 rounded-full flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-purple-600 sm:w-6 sm:h-6"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" x2="9.01" y1="9" y2="9" />
                    <line x1="15" x2="15.01" y1="9" y2="9" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base">Solana</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {walletAddress}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 sm:ml-4">
                <DisconnectSolanaWalletButton
                  walletAddress={walletAddress}
                  onSuccess={handleWalletDisconnected}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No wallet connected
            </div>
          )}

          <ConnectSolanaWalletButton
            onConnected={handleWalletConnected}
            disabled={!!walletAddress}
          />
        </div>
      </CardContent>
    </Card>
  );
}
