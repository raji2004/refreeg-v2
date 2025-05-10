"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectWalletButton } from "@/components/crypto-details/ConnectWalletButton";
import { DisconnectWalletButton } from "@/components/crypto-details/DisconnectWalletButton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface CryptoWallet {
  id: number;
  address: string;
  network: string;
}

export default function CryptoDetailsForm() {
  const [paymentMethods, setPaymentMethods] = useState<CryptoWallet[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletNetwork, setWalletNetwork] = useState<string>("Polygon");
  const supabase = createClient();

  useEffect(() => {
    const fetchWallets = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("crypto_wallets")
        .eq("id", user.id)
        .single();

      if (profile?.crypto_wallets) {
        const wallets = Object.entries(profile.crypto_wallets).map(
          ([network, address], index) => ({
            id: index,
            address: address as string,
            network,
          })
        );
        setPaymentMethods(wallets);
      }
    };

    fetchWallets();
  }, [supabase]);

  const handleWalletConnected = async (
    address: string,
    network: string = "Polygon"
  ) => {
    try {
      setWalletAddress(address);
      setWalletNetwork(network);

      // Add to local state
      const newWallet: CryptoWallet = {
        id: Date.now(),
        address,
        network,
      };

      setPaymentMethods((prev) => [...prev, newWallet]);
      toast.success("Wallet connected successfully");
    } catch (error) {
      console.error("Error handling wallet connection:", error);
      toast.error("Failed to connect wallet");
    }
  };

  const handleRemoveCryptoWallet = async (wallet: CryptoWallet) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get current crypto wallets
      const { data: profile } = await supabase
        .from("profiles")
        .select("crypto_wallets")
        .eq("id", user.id)
        .single();

      if (!profile?.crypto_wallets) return;

      // Remove the wallet from the crypto_wallets object
      const updatedWallets = { ...profile.crypto_wallets };
      delete updatedWallets[wallet.network];

      // Update in Supabase
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          crypto_wallets: updatedWallets,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Remove from local state
      setPaymentMethods((prev) =>
        prev.filter((method) => method.id !== wallet.id)
      );

      // Clear wallet connection if it's the currently connected one
      if (walletAddress === wallet.address) {
        setWalletAddress(null);
        setWalletNetwork("Polygon");
      }

      toast.success("Wallet disconnected successfully");
    } catch (error) {
      console.error("Error removing wallet:", error);
      toast.error("Failed to disconnect wallet");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crypto Wallets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paymentMethods.length > 0 ? (
            paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
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
                    <p className="font-medium">{method.network}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-md">
                      {method.address}
                    </p>
                  </div>
                </div>
                <DisconnectWalletButton
                  walletAddress={method.address}
                  onDisconnect={() => handleRemoveCryptoWallet(method)}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No crypto wallets connected
            </div>
          )}

          {walletAddress &&
            !paymentMethods.some((m) => m.address === walletAddress) && (
              <div className="p-4 border rounded-lg">
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
                    <p className="font-medium">{walletNetwork}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-md">
                      {walletAddress}
                    </p>
                  </div>
                </div>
              </div>
            )}

          <ConnectWalletButton onConnected={handleWalletConnected} />
        </div>
      </CardContent>
    </Card>
  );
}
