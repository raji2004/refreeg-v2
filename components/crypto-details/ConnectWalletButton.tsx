"use client";

import { useState } from "react";
import { BrowserProvider } from "ethers";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";

interface ConnectWalletButtonProps {
  onConnected?: (address: string, network?: string) => void;
}

export function ConnectWalletButton({ onConnected }: ConnectWalletButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const installMetaMask = () => {
    window.open("https://metamask.io/download/", "_blank");
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        const errorMsg = "MetaMask is not installed";
        setError(errorMsg);
        toast.error(errorMsg, {
          action: {
            label: "Install MetaMask",
            onClick: installMetaMask,
          },
          duration: 5000,
        });
        return;
      }

      const accounts = await window.ethereum.request<string[]>({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        const errorMsg = "No accounts found";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const address = accounts[0];
      if (!address) {
        const errorMsg = "No address found";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const errorMsg = "You must be logged in to connect a wallet";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          crypto_wallets: {
            [network.name]: address,
          },
        })
        .eq("id", user.id);

      if (updateError) {
        const errorMsg = "Failed to save wallet address";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (onConnected) {
        onConnected(address, network.name);
      }

      toast.success("Wallet connected successfully");
      return { address, network: network.name };
    } catch (err) {
      console.error("Wallet connection error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={connectWallet}
        disabled={isConnecting}
        className="w-full"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>

      {error && (
        <div className="text-sm text-red-500 mt-2">
          {error}
          {error === "MetaMask is not installed" && (
            <>
              <button
                onClick={installMetaMask}
                className="ml-2 text-blue-500 hover:text-blue-600 underline"
              >
                Install MetaMask
              </button>
              <span className="mx-2">|</span>
              <Link
                href="/guide/web3-wallet"
                className="text-blue-500 hover:text-blue-600 underline"
              >
                How to install a Web3 wallet
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
