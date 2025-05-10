// components/DisconnectWalletButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { ConfirmationModal } from "@/components/ConfirmationModal";

interface DisconnectWalletButtonProps {
  onDisconnect: () => Promise<void>;
  walletAddress: string;
}

export function DisconnectWalletButton({
  onDisconnect,
  walletAddress,
}: DisconnectWalletButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await onDisconnect();
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="text-red-500 hover:text-red-600 hover:bg-red-50"
      >
        <Trash2Icon className="h-4 w-4" />
      </Button>

      <ConfirmationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Wallet"
        description={`Are you sure you want to disconnect wallet ${walletAddress.slice(
          0,
          6
        )}...${walletAddress.slice(-4)}?`}
        confirmText={isLoading ? "Disconnecting..." : "Disconnect"}
      />
    </>
  );
}
