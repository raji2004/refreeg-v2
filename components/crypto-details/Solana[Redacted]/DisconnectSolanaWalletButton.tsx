// DisconnectSolanaWalletButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuthContext } from "@/components/auth-provider";
import { updateSolanaWallet } from "@/actions/profile-actions";

interface DisconnectSolanaWalletButtonProps {
  walletAddress: string;
  onSuccess?: () => void;
}

export function DisconnectSolanaWalletButton({
  walletAddress,
  onSuccess,
}: DisconnectSolanaWalletButtonProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthContext();

  const disconnectWallet = async () => {
    setIsDisconnecting(true);

    try {
      if (!user) {
        throw new Error("You must be logged in");
      }

      await updateSolanaWallet(user.id, null);

      // Disconnect from Phantom wallet
      if (window.solana?.isPhantom) {
        try {
          await window.solana.disconnect();
        } catch (err) {
          console.error("Phantom disconnect error:", err);
          // Continue even if Phantom disconnect fails
        }
      }

      // Call the callback BEFORE showing toast or resetting state
      if (onSuccess) {
        await onSuccess();
      }

      toast({
        title: "Success",
        description: "Wallet disconnected successfully",
      });
    } catch (err) {
      console.error("Wallet disconnection error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to disconnect wallet";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Button
      onClick={disconnectWallet}
      disabled={isDisconnecting}
      variant="destructive"
      size="sm"
    >
      {isDisconnecting ? "Disconnecting..." : "Disconnect"}
    </Button>
  );
}
