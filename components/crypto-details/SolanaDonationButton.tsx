"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { recordCryptoDonation } from "@/actions/crypto-donation-actions";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ExternalLink, CheckCircle, Wallet } from "lucide-react";

interface SolanaDonationButtonProps {
  causeId: string;
  onDonationSuccess?: (amountInNaira: number) => void;
}

// Exchange rate for SOL
const SOL_TO_NGN_RATE = 150000; // 1 SOL = 150,000 NGN

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      publicKey: { toString: () => string } | null;
    };
  }
}

export function SolanaDonationButton({
  causeId,
  onDonationSuccess,
}: SolanaDonationButtonProps) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);
  const [donationAmount, setDonationAmount] = useState("0.01");
  const [nairaAmount, setNairaAmount] = useState("1500");
  const [isDonating, setIsDonating] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);

  const supabase = createClient();
  const { toast } = useToast();

  // Check if Phantom is installed
  useEffect(() => {
    const isInstalled = typeof window !== "undefined" && !!window.solana?.isPhantom;
    setIsPhantomInstalled(isInstalled);
  }, []);

  // Fetch recipient address (Solana address)
  useEffect(() => {
    const fetchRecipientAddress = async () => {
      try {
        console.log("Fetching Solana address for cause:", causeId);
        
        const { data: causeData, error: causeError } = await supabase
          .from("causes")
          .select("user_id")
          .eq("id", causeId)
          .single();

        if (causeError || !causeData) throw new Error("Cause not found");

        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("crypto_wallets")
          .eq("id", causeData.user_id)
          .single();

        if (userError || !userData) throw new Error("Creator not found");

        const wallets = userData.crypto_wallets || {};
        console.log("Solana address:", wallets.solana_address);
        setRecipientAddress(wallets.solana_address || null);
      } catch (err) {
        console.error("Error fetching recipient address:", err);
        setError("Failed to load recipient wallet information");
        setRecipientAddress(null);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    fetchRecipientAddress();
  }, [causeId, supabase]);

  // Update Naira amount when donation amount changes
  useEffect(() => {
    const amount = parseFloat(donationAmount);
    if (!isNaN(amount) && amount > 0) {
      const nairaValue = (amount * SOL_TO_NGN_RATE).toFixed(2);
      setNairaAmount(nairaValue);
    } else {
      setNairaAmount("0.00");
    }
  }, [donationAmount]);

  const handleConnect = async () => {
    if (!window.solana) {
      toast({
        title: "Phantom Not Found",
        description: "Please install Phantom wallet to continue",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await window.solana.connect();
      setAddress(response.publicKey.toString());
      setIsConnected(true);
      
      toast({
        title: "Wallet Connected",
        description: "Phantom wallet connected successfully!",
      });
    } catch (error: any) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    if (window.solana) {
      await window.solana.disconnect();
    }
    setIsConnected(false);
    setAddress(null);
  };

  const handleDonate = async () => {
    if (!isConnected || !address || !recipientAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet and ensure recipient address is available",
        variant: "destructive",
      });
      return;
    }

    setIsDonating(true);
    setError(null);

    try {
      // For now, we'll simulate a transaction
      // In a real implementation, you would use @solana/web3.js to create and send transactions
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
      
      const mockTxHash = `sol_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setTxHash(mockTxHash);

      // Calculate Naira amount for success callback
      const nairaValue = parseFloat(nairaAmount);
      
      // Record the crypto donation in the database
      try {
        await recordCryptoDonation({
          causeId,
          txHash: mockTxHash,
          amountInCrypto: parseFloat(donationAmount),
          amountInNaira: nairaValue,
          donorWalletAddress: address,
          recipientAddress: recipientAddress,
          userId: user?.id || "00000000-0000-0000-0000-000000000000", // Use actual user ID or anonymous UUID
          network: "Solana",
          currency: "SOL",
          walletType: "Phantom",
        });

        console.log("Crypto donation recorded successfully");
      } catch (recordError) {
        console.error("Error recording crypto donation:", recordError);
        // Don't fail the transaction, just log the error
      }

      if (onDonationSuccess) {
        onDonationSuccess(nairaValue);
      }

      toast({
        title: "Donation Successful!",
        description: `Successfully donated ${donationAmount} SOL`,
      });

    } catch (error: any) {
      console.error("Donation error:", error);
      setError(error.message || "Transaction failed");
      toast({
        title: "Donation Failed",
        description: error.message || "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setIsDonating(false);
    }
  };

  if (isLoadingAddress) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading donation options...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recipientAddress) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>This cause creator has not set up their Solana wallet yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isPhantomInstalled) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold mb-2">Phantom Wallet Required</h3>
            <p className="text-gray-600 mb-4">
              Please install Phantom wallet to make Solana donations
            </p>
            <Button asChild>
              <a
                href="https://phantom.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                Install Phantom
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
        </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Solana Donation
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect your Phantom wallet to donate in SOL
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {!isConnected ? (
          <div className="text-center py-4">
            <Button onClick={handleConnect} className="w-full">
              <Wallet className="w-4 h-4 mr-2" />
              Connect Phantom
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Wallet Info */}
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Connected</p>
                  <p className="text-xs text-purple-600">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  className="text-purple-600 border-purple-200 hover:bg-purple-100"
                >
                  Disconnect
                </Button>
        </div>
      </div>

            {/* Donation Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Donation Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  min="0"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  placeholder="0.01"
                  className="flex-1"
                />
                <div className="px-3 py-2 bg-gray-100 rounded-md text-sm font-medium">
                  SOL
          </div>
        </div>
              <p className="text-sm text-gray-600">
                ≈ ₦{nairaAmount} NGN
        </p>
      </div>

            {/* Error Display */}
      {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

            {/* Donate Button */}
            <Button
              onClick={handleDonate}
              disabled={isDonating || !recipientAddress}
              className="w-full"
            >
              {isDonating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                `Donate ${donationAmount} SOL`
              )}
            </Button>

            {/* Success Message */}
            {txHash && (
              <div className="p-3 bg-green-50 text-green-700 rounded-md">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">Donation Successful!</span>
                </div>
          <p className="mt-1 text-sm">
            Transaction:{" "}
            <a
                    href={`https://solscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
                    className="underline hover:no-underline flex items-center gap-1"
            >
                    View on Solscan
                    <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      )}
    </div>
        )}
      </CardContent>
    </Card>
  );
}