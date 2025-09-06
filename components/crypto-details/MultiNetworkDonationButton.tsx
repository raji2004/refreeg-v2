"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMultiWallet } from "@/hooks/use-multi-wallet";
import { SUPPORTED_NETWORKS, getNetworkByChainId } from "@/lib/networks";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { ethers } from "ethers";
import { Loader2, ExternalLink, CheckCircle } from "lucide-react";

interface MultiNetworkDonationButtonProps {
  causeId: string;
  onDonationSuccess?: (amountInNaira: number) => void;
}

// Exchange rates (in a real app, these would come from an API)
const EXCHANGE_RATES: Record<string, number> = {
  ETH: 3500000, // 1 ETH = 3,500,000 NGN
  MATIC: 413,   // 1 MATIC = 413 NGN
  BNB: 250000,  // 1 BNB = 250,000 NGN
};

export function MultiNetworkDonationButton({
  causeId,
  onDonationSuccess,
}: MultiNetworkDonationButtonProps) {
  const {
    isConnected,
    address,
    chainId,
    network,
    connect,
    switchNetwork,
    getBalance,
    error: walletError,
  } = useMultiWallet();

  const [donationAmount, setDonationAmount] = useState("0.01");
  const [nairaAmount, setNairaAmount] = useState("4.13");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("polygonAmoy");
  const [isDonating, setIsDonating] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);

  const supabase = createClient();
  const { toast } = useToast();

  // Get current network config
  const currentNetwork = getNetworkByChainId(chainId || "");
  const selectedNetworkConfig = SUPPORTED_NETWORKS[selectedNetwork];

  // Fetch recipient address
  useEffect(() => {
    const fetchRecipientAddress = async () => {
      try {
        console.log("Fetching recipient address for cause:", causeId);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 8000)
        );
        
        const queryPromise = supabase
          .from("causes")
          .select("user_id")
          .eq("id", causeId)
          .single();

        const { data: causeData, error: causeError } = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as any;

        console.log("Cause data:", causeData);
        console.log("Cause error:", causeError);

        if (causeError || !causeData) throw new Error("Cause not found");

        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("crypto_wallets")
          .eq("id", causeData.user_id)
          .single();

        console.log("User data:", userData);
        console.log("User error:", userError);

        if (userError || !userData) throw new Error("Creator not found");

        // Get wallet address for the selected network
        const wallets = userData.crypto_wallets || {};
        console.log("Crypto wallets:", wallets);
        console.log("Selected network:", selectedNetwork);
        
        // Map network keys to wallet keys
        const networkKeyMap: Record<string, string> = {
          'ethereum': 'ethereum',
          'polygon': 'polygon', 
          'polygonAmoy': 'polygon',
          'bsc': 'bsc',
          'arbitrum': 'arbitrum',
          'optimism': 'optimism',
          'sepolia': 'ethereum'
        };
        const walletKey = networkKeyMap[selectedNetwork] || selectedNetwork;
        console.log("Wallet key:", walletKey);
        console.log("Wallet address:", wallets[walletKey]);
        setRecipientAddress(wallets[walletKey] || null);
      } catch (err) {
        console.error("Error fetching recipient address:", err);
        setError("Failed to load recipient wallet information");
        setRecipientAddress(null);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    fetchRecipientAddress();
  }, [causeId, selectedNetwork, supabase, selectedNetworkConfig]);

  // Update Naira amount when donation amount changes
  useEffect(() => {
    const amount = parseFloat(donationAmount);
    if (!isNaN(amount) && amount > 0) {
      const rate = EXCHANGE_RATES[selectedNetworkConfig.nativeCurrency.symbol] || 1;
      const nairaValue = (amount * rate).toFixed(2);
      setNairaAmount(nairaValue);
    } else {
      setNairaAmount("0.00");
    }
  }, [donationAmount, selectedNetworkConfig]);

  // Fetch balance when connected
  useEffect(() => {
    if (isConnected && address) {
      const fetchBalance = async () => {
        try {
          const bal = await getBalance();
          setBalance(parseFloat(bal).toFixed(6));
        } catch (error) {
          console.error("Error fetching balance:", error);
        }
      };
      fetchBalance();
    }
  }, [isConnected, address, getBalance]);

  const handleDonate = async () => {
    if (!isConnected) {
      await connect(selectedNetwork);
      return;
    }

    if (!recipientAddress) {
      toast({
        title: "Error",
        description: "Recipient wallet address not available",
        variant: "destructive",
      });
      return;
    }

    setIsDonating(true);
    setError(null);
    setTxHash(null);

    try {
      const amount = parseFloat(donationAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid donation amount");
      }

      // Switch to selected network if not already on it
      if (currentNetwork?.chainName !== selectedNetworkConfig.chainName) {
        await switchNetwork(selectedNetwork);
      }

      // Check balance
      const currentBalance = parseFloat(balance);
      if (currentBalance < amount) {
        throw new Error(`Insufficient ${selectedNetworkConfig.nativeCurrency.symbol} balance`);
      }

      // Create transaction
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      
      const tx = await signer.sendTransaction({
        to: recipientAddress,
        value: ethers.parseEther(donationAmount),
      });

      setTxHash(tx.hash);
      toast({
        title: "Transaction Submitted",
        description: "Waiting for confirmation...",
      });

      // Wait for confirmation
      const receipt = await tx.wait();
      if (!receipt || receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      // Log donation
      await logDonation(
        causeId,
        tx.hash,
        amount,
        parseFloat(nairaAmount),
        address!,
        recipientAddress
      );

      toast({
        title: "Success",
        description: "Thank you for your donation!",
      });

      onDonationSuccess?.(parseFloat(nairaAmount));
    } catch (err: any) {
      console.error("Donation error:", err);
      setError(err.message || "Donation failed");
      toast({
        title: "Error",
        description: err.message || "Donation failed",
        variant: "destructive",
      });
    } finally {
      setIsDonating(false);
    }
  };

  const logDonation = async (
    causeId: string,
    txHash: string,
    amountInCrypto: number,
    amountInNaira: number,
    donorAddress: string,
    recipientAddress: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error: insertError } = await supabase
      .from("crypto_donations")
      .insert({
        cause_id: causeId,
        tx_signature: txHash,
        amount_in_sol: selectedNetworkConfig.nativeCurrency.symbol === "ETH" ? amountInCrypto : null,
        amount_in_naira: amountInNaira,
        wallet_address: donorAddress,
        recipient_address: recipientAddress,
        user_id: user.id,
        payment_method: selectedNetworkConfig.nativeCurrency.symbol,
        status: "completed",
        network: selectedNetworkConfig.chainName,
        currency: selectedNetworkConfig.nativeCurrency.symbol,
        wallet_type: "metamask",
      });

    if (insertError) throw insertError;

    // Update cause raised amount
    const { error: updateError } = await supabase.rpc("increment_cause_raised", {
      cause_id: causeId,
      amount: amountInNaira,
    });

    if (updateError) throw updateError;
  };

  if (isLoadingAddress) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recipientAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Multi-Network Donation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-50 text-yellow-700 rounded-md">
            <p>The creator hasn't set up a wallet address for this network.</p>
            <p className="mt-2 text-sm">
              Please try a different network or contact the creator.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Network Donation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Selection */}
        <div className="space-y-2">
          <Label htmlFor="network">Select Network</Label>
          <Select
            value={selectedNetwork}
            onValueChange={setSelectedNetwork}
            disabled={isDonating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SUPPORTED_NETWORKS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span>{config.chainName}</span>
                    <span className="text-xs text-gray-500">
                      ({config.nativeCurrency.symbol})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Donation Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount">
            Amount ({selectedNetworkConfig.nativeCurrency.symbol})
          </Label>
          <Input
            id="amount"
            type="number"
            min="0.001"
            step="0.001"
            value={donationAmount}
            onChange={(e) => setDonationAmount(e.target.value)}
            disabled={isDonating}
            placeholder="0.01"
          />
        </div>

        {/* Naira Equivalent */}
        <div className="space-y-2">
          <Label htmlFor="naira">Amount (Naira)</Label>
          <Input
            id="naira"
            type="text"
            value={`₦${parseFloat(nairaAmount).toLocaleString()}`}
            disabled
            className="bg-gray-50"
          />
          <p className="text-xs text-gray-500">
            1 {selectedNetworkConfig.nativeCurrency.symbol} ≈ ₦{EXCHANGE_RATES[selectedNetworkConfig.nativeCurrency.symbol]?.toLocaleString()}
          </p>
        </div>

        {/* Balance Display */}
        {isConnected && (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Your Balance: {balance} {selectedNetworkConfig.nativeCurrency.symbol}
            </p>
          </div>
        )}

        {/* Error Display */}
        {(error || walletError) && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error || walletError}
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
          ) : !isConnected ? (
            `Connect & Donate ${selectedNetworkConfig.nativeCurrency.symbol}`
          ) : (
            `Donate ${donationAmount} ${selectedNetworkConfig.nativeCurrency.symbol}`
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
                href={`${selectedNetworkConfig.blockExplorer}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline flex items-center gap-1"
              >
                View on Explorer
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
