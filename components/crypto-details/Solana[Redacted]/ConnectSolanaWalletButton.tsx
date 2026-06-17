// ConnectSolanaWalletButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuthContext } from "@/components/auth-provider";
import { updateSolanaWallet } from "@/actions/profile-actions";

interface ConnectSolanaWalletButtonProps {
  onConnected?: (address: string) => void;
  disabled?: boolean;
}

export function ConnectSolanaWalletButton({
  onConnected,
  disabled,
}: ConnectSolanaWalletButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuthContext();

  const installPhantom = () => {
    window.open("https://phantom.app/", "_blank");
  };

  const connectWallet = async () => {
    if (disabled) return;

    setIsConnecting(true);
    setError(null);

    try {
      if (!window.solana?.isPhantom) {
        const errorMsg = "Phantom wallet is not installed";
        setError(errorMsg);
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMsg,
          action: (
            <Button variant="outline" onClick={installPhantom}>
              Install Phantom
            </Button>
          ),
        });
        return;
      }

      const response = await window.solana.connect();
      const publicKey = response.publicKey.toString();

      if (!user) {
        throw new Error("You must be logged in to connect a wallet");
      }

      await updateSolanaWallet(user.id, publicKey);

      // Call the callback BEFORE showing toast or resetting state
      if (onConnected) {
        await onConnected(publicKey);
      }

      toast({
        title: "Success",
        description: "Solana wallet connected successfully",
      });
    } catch (err) {
      console.error("Wallet connection error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={connectWallet}
        disabled={isConnecting || disabled}
        className="w-full"
      >
        {isConnecting ? "Connecting..." : "Connect Solana Wallet"}
      </Button>

      {error && (
        <div className="text-sm text-red-500 mt-2">
          {error}
          {error === "Phantom wallet is not installed" && (
            <button
              onClick={installPhantom}
              className="ml-2 text-blue-500 hover:text-blue-600 underline"
            >
              Install Phantom
            </button>
          )}
        </div>
      )}
    </div>
  );
}
