"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useMultiWallet } from "@/hooks/use-multi-wallet";
import { useTokenBalances } from "@/hooks/use-token-balances";
import { useAuth } from "@/hooks/use-auth";
import { recordCryptoDonation } from "@/actions/crypto-donation-actions";
import { SUPPORTED_NETWORKS } from "@/lib/networks";
import { getTokensForNetwork, getNativeToken } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ExternalLink, CheckCircle } from "lucide-react";

interface MetaMaskDonationButtonProps {
  causeId: string;
  recipientAddress: string;
  onDonationSuccess?: (amountInNaira: number) => void;
}

export function MetaMaskDonationButton({
  causeId,
  recipientAddress,
  onDonationSuccess,
}: MetaMaskDonationButtonProps) {
  const [donationAmount, setDonationAmount] = useState("0.01");
  const [nairaAmount, setNairaAmount] = useState("4.50");
  const [selectedToken, setSelectedToken] = useState<string>("");
  const [isDonating, setIsDonating] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { walletInfo, connectMetaMask, isConnecting, error: walletError } = useMultiWallet();
  const { balances, isLoading: balancesLoading, refreshBalances } = useTokenBalances(
    walletInfo?.address || null,
    walletInfo?.chainId || null
  );
  
  const { toast } = useToast();

  // Set default token when balances load
  useEffect(() => {
    if (balances.length > 0 && !selectedToken) {
      const nativeToken = balances.find(token => token.address === "0x0000000000000000000000000000000000000000");
      if (nativeToken) {
        setSelectedToken(nativeToken.address);
      } else {
        setSelectedToken(balances[0].address);
      }
    }
  }, [balances, selectedToken]);

  // Update Naira amount when token selection changes
  useEffect(() => {
    if (selectedToken && balances.length > 0) {
      const token = balances.find(t => t.address === selectedToken);
      if (token && donationAmount) {
        const amount = parseFloat(donationAmount);
        if (!isNaN(amount) && amount > 0) {
          const nairaValue = (amount * token.exchangeRate).toFixed(2);
          setNairaAmount(nairaValue);
        }
      }
    }
  }, [selectedToken, donationAmount, balances]);

  const handleAmountChange = (value: string) => {
    setDonationAmount(value);
    if (selectedToken && balances.length > 0) {
      const token = balances.find(t => t.address === selectedToken);
      if (token) {
        const amount = parseFloat(value);
        if (!isNaN(amount) && amount > 0) {
          const nairaValue = (amount * token.exchangeRate).toFixed(2);
          setNairaAmount(nairaValue);
        } else {
          setNairaAmount("0.00");
        }
      }
    }
  };

  const handleDonate = async () => {
    if (!walletInfo) {
      await connectMetaMask();
      return;
    }

    if (!selectedToken || balances.length === 0) {
      toast({
        title: "Error",
        description: "Please select a token to donate",
        variant: "destructive",
      });
      return;
    }

    const token = balances.find(t => t.address === selectedToken);
    if (!token) {
      toast({
        title: "Error",
        description: "Selected token not found",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(donationAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (BigInt(token.balance) < BigInt(ethers.parseUnits(amount.toString(), token.decimals))) {
      toast({
        title: "Error",
        description: "Insufficient balance",
        variant: "destructive",
      });
      return;
    }

    setIsDonating(true);
    setError(null);
    setTxHash(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner();
      const amountInWei = ethers.parseUnits(amount.toString(), token.decimals);

      let tx;

      if (token.address === "0x0000000000000000000000000000000000000000") {
        // Native token transfer
        tx = await signer.sendTransaction({
          to: recipientAddress,
          value: amountInWei,
        });
      } else {
        // ERC-20 token transfer
        const contract = new ethers.Contract(
          token.address,
          [
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)",
          ],
          signer
        );

        tx = await contract.transfer(recipientAddress, amountInWei);
      }

      setTxHash(tx.hash);

      toast({
        title: "Transaction Sent",
        description: "Waiting for confirmation...",
      });

      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Transaction successful, record in database
        try {
          await recordCryptoDonation({
            causeId,
            txHash: tx.hash,
            amountInCrypto: amount,
            amountInNaira: parseFloat(nairaAmount),
            donorWalletAddress: walletInfo.address,
            recipientAddress,
            network: walletInfo.network,
            currency: token.symbol,
            walletType: "metamask",
            userId: user?.id || "00000000-0000-0000-0000-000000000000",
          });

          onDonationSuccess?.(parseFloat(nairaAmount));

          toast({
            title: "Success",
            description: "Thank you for your donation!",
          });
        } catch (dbError) {
          console.error("Error recording donation:", dbError);
          toast({
            title: "Warning",
            description: "Transaction successful but failed to update records. Please contact support.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err: any) {
      console.error("Donation error:", err);
      
      let errorMessage = "Donation failed. Please try again.";
      if (err.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected";
      } else if (err.message.includes("insufficient")) {
        errorMessage = "Insufficient balance";
      } else if (err.message.includes("network")) {
        errorMessage = "Network error. Please check your connection";
      }

      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDonating(false);
    }
  };

  if (!walletInfo) {
    return (
      <div className="space-y-4">
        <Button
          onClick={connectMetaMask}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect MetaMask"
          )}
        </Button>
        {walletError && (
          <p className="text-sm text-red-600">{walletError}</p>
        )}
      </div>
    );
  }

  if (balancesLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading balances...</span>
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600">No tokens found in your wallet</p>
        <Button
          onClick={refreshBalances}
          variant="outline"
          className="mt-2"
        >
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="token-select">Select Token</Label>
        <Select value={selectedToken} onValueChange={setSelectedToken}>
          <SelectTrigger>
            <SelectValue placeholder="Select a token" />
          </SelectTrigger>
          <SelectContent>
            {balances.map((token) => (
              <SelectItem key={token.address} value={token.address}>
                <div className="flex items-center justify-between w-full">
                  <span>{token.symbol}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {token.formattedBalance}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount ({balances.find(t => t.address === selectedToken)?.symbol})</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          step="0.000001"
          value={donationAmount}
          onChange={(e) => handleAmountChange(e.target.value)}
          disabled={isDonating}
          placeholder="0.01"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="naira-amount">Amount (₦)</Label>
        <Input
          id="naira-amount"
          type="text"
          value={nairaAmount}
          readOnly
          className="bg-gray-50"
        />
      </div>

      <Button
        onClick={handleDonate}
        disabled={isDonating || !selectedToken || !donationAmount}
        className="w-full"
      >
        {isDonating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Donate ${balances.find(t => t.address === selectedToken)?.symbol}`
        )}
      </Button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {txHash && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Transaction successful!
          </div>
          <a
            href={`${SUPPORTED_NETWORKS[walletInfo.network]?.blockExplorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center mt-1 text-blue-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View on Explorer
          </a>
        </div>
      )}
    </div>
  );
}
