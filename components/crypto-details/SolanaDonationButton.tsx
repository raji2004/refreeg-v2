"use client";

import { useState, useEffect, useRef } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { useAuth } from "@/hooks/use-auth";
import { recordCryptoDonation } from "@/actions/crypto-donation-actions";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, CheckCircle } from "lucide-react";

const DEFAULT_SOL_TO_NAIRA_RATE = 225814.49;
const SOLANA_RPC_URL = "https://api.testnet.solana.com";

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: PublicKey }>;
      signAndSendTransaction: (
        transaction: Transaction
      ) => Promise<{ signature: string }>;
    };
  }
}

interface SolanaDonationButtonProps {
  causeId: string;
  recipientAddress: string;
  onDonationSuccess?: (amountInNaira: number) => void;
}

export function SolanaDonationButton({
  causeId,
  recipientAddress,
  onDonationSuccess,
}: SolanaDonationButtonProps) {
  const [donationAmount, setDonationAmount] = useState("0.1");
  const [nairaInput, setNairaInput] = useState("30.25");
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_SOL_TO_NAIRA_RATE);
  const [isDonating, setIsDonating] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"sol" | "naira">("sol");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const nairaInputRef = useRef<HTMLInputElement>(null);
  const solInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const getExchangeRate = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=ngn"
        );
        const data = await response.json();
        setExchangeRate(data.solana.ngn || DEFAULT_SOL_TO_NAIRA_RATE);
      } catch (error) {
        console.error("Error fetching SOL rate:", error);
        setExchangeRate(DEFAULT_SOL_TO_NAIRA_RATE);
      }
    };
    getExchangeRate();

    const interval = setInterval(getExchangeRate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatNumberWithCommas = (value: string): string => {
    if (!value || isNaN(parseFloat(value))) return value;
    const parts = value.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
  };

  const removeCommas = (value: string): string => value.replace(/,/g, "");

  const formatInputValue = (
    value: string,
    cursorPosition: number
  ): { formattedValue: string; newCursorPosition: number } => {
    const cleanValue = removeCommas(value);
    const formattedValue = formatNumberWithCommas(cleanValue);

    const commasBeforeCursor = (
      value.substring(0, cursorPosition).match(/,/g) || []
    ).length;
    const commasInFormatted = (
      formattedValue.substring(0, cursorPosition).match(/,/g) || []
    ).length;
    const newCursorPosition =
      cursorPosition + (commasInFormatted - commasBeforeCursor);

    return { formattedValue, newCursorPosition };
  };

  const handleSolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMode("sol");
    setDonationAmount(value);

    const amount = parseFloat(value);
    if (!isNaN(amount) && amount > 0) {
      const nairaValue = (amount * exchangeRate).toFixed(2);
      setNairaInput(formatNumberWithCommas(nairaValue));
    } else {
      setNairaInput("0.00");
    }
  };

  const handleNairaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    setInputMode("naira");

    const sanitizedValue = value.replace(/[^\d,\.]/g, "");
    const { formattedValue, newCursorPosition } = formatInputValue(
      sanitizedValue,
      cursorPosition
    );

    setNairaInput(formattedValue);

    setTimeout(() => {
      if (nairaInputRef.current) {
        nairaInputRef.current.setSelectionRange(
          newCursorPosition,
          newCursorPosition
        );
      }
    }, 0);

    const cleanValue = removeCommas(formattedValue);
    const amount = parseFloat(cleanValue);
    if (!isNaN(amount) && amount > 0) {
      const solValue = (amount / exchangeRate).toFixed(6);
      setDonationAmount(solValue);
    } else {
      setDonationAmount("0.00");
    }
  };

  const handleNairaKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      [46, 8, 9, 27, 13, 110, 190, 37, 39, 35, 36].indexOf(e.keyCode) !== -1 ||
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true)
    ) {
      return;
    }
    if (
      (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
      (e.keyCode < 96 || e.keyCode > 105)
    ) {
      e.preventDefault();
    }
  };

  const connectWallet = async () => {
    if (!window.solana?.isPhantom) {
      toast({
        title: "Error",
        description: "Phantom wallet is not installed",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const response = await window.solana.connect();
      const publicKey = response.publicKey.toString();
      setWalletAddress(publicKey);
    } catch (err) {
      console.error("Wallet connection error:", err);
      toast({
        title: "Error",
        description: "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDonate = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }

    setIsDonating(true);
    setError(null);
    setTxSignature(null);

    try {
      const amount = parseFloat(donationAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid donation amount");
      }

      const connection = new Connection(SOLANA_RPC_URL, "confirmed");
      const recipientPublicKey = new PublicKey(recipientAddress);
      const senderPublicKey = new PublicKey(walletAddress);
      const amountInLamports = Math.round(amount * LAMPORTS_PER_SOL);

      const balance = await connection.getBalance(senderPublicKey);
      if (balance < amountInLamports) {
        throw new Error(
          `Insufficient SOL balance. You have ${(
            balance / LAMPORTS_PER_SOL
          ).toFixed(6)} SOL, but need ${(
            amountInLamports / LAMPORTS_PER_SOL
          ).toFixed(6)} SOL`
        );
      }

      const { blockhash } = await connection.getLatestBlockhash();

      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: senderPublicKey,
      });

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: senderPublicKey,
          toPubkey: recipientPublicKey,
          lamports: amountInLamports,
        })
      );

      if (!window.solana) {
        throw new Error("Wallet is not available");
      }

      const { signature } = await window.solana.signAndSendTransaction(
        transaction
      );
      setTxSignature(signature);

      toast({
        title: "Transaction Sent",
        description: "Waiting for confirmation...",
      });

      try {
        await Promise.race([
          connection.confirmTransaction(signature, "confirmed"),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Transaction confirmation timeout")),
              30000
            )
          ),
        ]);
      } catch (confirmError) {
        toast({
          title: "Transaction Processing",
          description:
            "Transaction may still be processing. Check Solana Explorer for status.",
        });
      }

      const nairaAmount = parseFloat(removeCommas(nairaInput));
      const solAmount = parseFloat(donationAmount);

      try {
        await recordCryptoDonation({
          causeId,
          txHash: signature,
          amountInCrypto: solAmount,
          amountInNaira: nairaAmount,
          donorWalletAddress: walletAddress,
          recipientAddress,
          network: "solana",
          currency: "SOL",
          walletType: "solana",
          userId: user?.id || "00000000-0000-0000-0000-000000000000",
        });

        onDonationSuccess?.(nairaAmount);

        toast({
          title: "Success",
          description: "Thank you for your donation!",
        });
      } catch (logError) {
        console.error("Failed to log transaction:", logError);
        toast({
          title: "Warning",
          description:
            "Transaction completed but failed to update records. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Donation error:", err);

      let userFriendlyMessage = "Donation failed. Please try again.";
      const errorMessage = err.message.toLowerCase();

      if (errorMessage.includes("user rejected")) {
        userFriendlyMessage = "Transaction was rejected";
      } else if (errorMessage.includes("network")) {
        userFriendlyMessage = "Network error. Please check your connection";
      } else if (
        errorMessage.includes("insufficient") ||
        errorMessage.includes("balance")
      ) {
        userFriendlyMessage = "Insufficient SOL balance";
      } else if (errorMessage.includes("invalid address")) {
        userFriendlyMessage = "Invalid recipient address";
      } else if (errorMessage.includes("phantom")) {
        userFriendlyMessage = "Please install Phantom wallet";
      } else if (errorMessage.includes("blockhash")) {
        userFriendlyMessage = "Network issue. Please try again";
      } else if (errorMessage.includes("timeout")) {
        userFriendlyMessage =
          "Transaction is taking longer than expected. Check Solana Explorer.";
      }

      setError(userFriendlyMessage);
      toast({
        title: "Error",
        description: userFriendlyMessage,
        variant: "destructive",
      });
    } finally {
      setIsDonating(false);
    }
  };

  if (!walletAddress) {
    return (
      <div className="space-y-4">
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect Phantom Wallet"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sol-amount">Amount (SOL)</Label>
        <Input
          id="sol-amount"
          ref={solInputRef}
          type="number"
          min="0.01"
          step="0.01"
          value={donationAmount}
          onChange={handleSolChange}
          disabled={isDonating}
          placeholder="0.1"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="naira-amount">Amount (₦)</Label>
        <Input
          id="naira-amount"
          ref={nairaInputRef}
          type="text"
          value={nairaInput}
          onChange={handleNairaChange}
          onKeyDown={handleNairaKeyDown}
          disabled={isDonating}
          placeholder="0.00"
        />
        <p className="text-xs text-gray-500">
          Using Solana Testnet (1 SOL ≈ ₦{exchangeRate.toFixed(2)})
        </p>
      </div>

      <Button
        onClick={handleDonate}
        disabled={isDonating}
        className="w-full"
      >
        {isDonating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Donate with SOL"
        )}
      </Button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {txSignature && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Transaction successful!
          </div>
          <a
            href={`https://explorer.solana.com/tx/${txSignature}?cluster=testnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center mt-1 text-blue-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View on Solana Explorer
          </a>
        </div>
      )}
    </div>
  );
}