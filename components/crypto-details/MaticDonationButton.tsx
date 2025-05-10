"use client";

import { useState, useEffect } from "react";
import { BrowserProvider, ethers } from "ethers";
import { MetaMaskInpageProvider } from "@metamask/providers";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

const DEFAULT_MATIC_TO_NAIRA_RATE = 302.51;

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

interface MaticDonationButtonProps {
  causeId: string;
  onDonationSuccess?: (amountInNaira: number) => void;
}

export default function MaticDonationButton({
  causeId,
  onDonationSuccess,
}: MaticDonationButtonProps) {
  const [donationAmount, setDonationAmount] = useState<string>("0.1");
  const [nairaEquivalent, setNairaEquivalent] = useState<string>("30.25");
  const [formattedNairaEquivalent, setFormattedNairaEquivalent] =
    useState<string>("30.25");
  const [exchangeRate] = useState<number>(DEFAULT_MATIC_TO_NAIRA_RATE);
  const [isDonating, setIsDonating] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(true);
  const [inputMode, setInputMode] = useState<"matic" | "naira">("matic");
  const params = useParams();
  const supabase = createClient();

  // Format number with commas
  const formatNumberWithCommas = (value: string): string => {
    if (!value || isNaN(parseFloat(value))) return value;
    const parts = value.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
  };

  // Remove commas for calculations
  const removeCommas = (value: string): string => {
    return value.replace(/,/g, "");
  };

  useEffect(() => {
    if (inputMode === "matic") {
      const amount = parseFloat(donationAmount);
      if (!isNaN(amount) && amount > 0) {
        const nairaValue = (amount * exchangeRate).toFixed(2);
        setNairaEquivalent(nairaValue);
        setFormattedNairaEquivalent(formatNumberWithCommas(nairaValue));
      } else {
        setNairaEquivalent("0.00");
        setFormattedNairaEquivalent("0.00");
      }
    }
  }, [donationAmount, exchangeRate, inputMode]);

  useEffect(() => {
    if (inputMode === "naira") {
      const amount = parseFloat(removeCommas(nairaEquivalent));
      if (!isNaN(amount) && amount > 0) {
        const maticValue = (amount / exchangeRate).toFixed(6);
        setDonationAmount(maticValue);
      } else {
        setDonationAmount("0.00");
      }
    }
  }, [nairaEquivalent, exchangeRate, inputMode]);

  const handleMaticChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMode("matic");
    setDonationAmount(e.target.value);
  };

  const handleNairaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMode("naira");
    const rawValue = removeCommas(e.target.value);
    setNairaEquivalent(rawValue);
    setFormattedNairaEquivalent(formatNumberWithCommas(rawValue));
  };

  useEffect(() => {
    const fetchRecipientAddress = async () => {
      try {
        // Get cause creator's ID
        const { data: cause } = await supabase
          .from("causes")
          .select("user_id")
          .eq("id", causeId)
          .single();

        if (!cause) {
          throw new Error("Cause not found");
        }

        // Get creator's profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("crypto_wallets")
          .eq("id", cause.user_id)
          .single();

        if (!profile) {
          throw new Error("Creator not found");
        }

        if (profile.crypto_wallets?.ethereum) {
          setRecipientAddress(profile.crypto_wallets.ethereum);
        } else {
          setRecipientAddress(null);
        }
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

  const logTransaction = async (
    causeId: string,
    txHash: string,
    amountInMatic: number,
    amountInNaira: number,
    walletAddress: string,
    recipientAddress: string
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not logged in - transaction not logged");
        return;
      }

      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          cause_id: causeId,
          tx_hash: txHash,
          amount_in_matic: amountInMatic,
          amount_in_naira: amountInNaira,
          wallet_address: walletAddress,
          recipient_address: recipientAddress,
          user_id: user.id,
          payment_method: "MATIC",
          status: "completed",
          network: "Polygon Mainnet",
          currency: "MATIC",
        });

      if (insertError) throw insertError;

      console.log(
        "Transaction logged with recipient address:",
        recipientAddress
      );
    } catch (error) {
      console.error("Error logging transaction:", error);
    }
  };

  const switchToMainnet = async () => {
    try {
      await window.ethereum?.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x89" }], // Polygon mainnet chain ID
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum?.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x89",
                chainName: "Polygon Mainnet",
                nativeCurrency: {
                  name: "MATIC",
                  symbol: "MATIC",
                  decimals: 18,
                },
                rpcUrls: ["https://polygon-rpc.com/"],
                blockExplorerUrls: ["https://polygonscan.com/"],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add Polygon network:", addError);
          throw new Error("Please add Polygon network to MetaMask manually");
        }
      } else {
        console.error("Failed to switch to Polygon network:", switchError);
        throw new Error("Failed to switch to Polygon network");
      }
    }
  };

  const handleDonate = async () => {
    if (!recipientAddress) {
      toast.error("Recipient wallet address not available");
      setError("Recipient wallet address not available");
      return;
    }

    if (!window.ethereum) {
      toast.error("Please install MetaMask to donate with MATIC");
      setError("Please install MetaMask to donate with MATIC");
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

      await window.ethereum.request({ method: "eth_requestAccounts" });

      try {
        await switchToMainnet();
      } catch (networkError) {
        console.error("Network error:", networkError);
        throw new Error(
          "Please switch to Polygon Mainnet in your wallet and try again"
        );
      }

      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      const balance = await provider.getBalance(walletAddress);
      const amountInWei = ethers.parseEther(donationAmount);

      if (balance < amountInWei) {
        throw new Error(
          "Insufficient MATIC balance. Please ensure you have enough MATIC in your wallet"
        );
      }

      const tx = await signer.sendTransaction({
        to: recipientAddress,
        value: amountInWei,
      });

      setTxHash(tx.hash);
      toast.success("Transaction submitted! Waiting for confirmation...");

      const receipt = await tx.wait();
      toast.success("Transaction confirmed! Thank you for your donation.");

      const nairaAmount = parseFloat(removeCommas(nairaEquivalent));
      const maticAmount = parseFloat(donationAmount);

      // Update cause raised amount
      const { error: updateError } = await supabase
        .from("causes")
        .update({
          raised_amount: supabase.rpc("increment", {
            amount: nairaAmount,
          }),
        })
        .eq("id", causeId);

      if (updateError) throw updateError;

      // Log transaction
      await logTransaction(
        causeId,
        tx.hash,
        maticAmount,
        nairaAmount,
        walletAddress,
        recipientAddress
      );

      if (onDonationSuccess) {
        onDonationSuccess(nairaAmount);
      }
    } catch (err: any) {
      console.error("Donation error:", {
        message: err.message,
        code: err.code,
        data: err.data,
        stack: err.stack,
        fullError: err,
      });

      let userFriendlyMessage = "Donation failed. Please try again.";

      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        userFriendlyMessage = "Transaction was rejected by your wallet";
      } else if (
        err.code === "NETWORK_ERROR" ||
        err.message?.includes("network")
      ) {
        userFriendlyMessage = "Network error. Please check your connection";
      } else if (
        err.message?.includes("insufficient funds") ||
        err.message?.includes("Insufficient") ||
        err.message?.includes("not enough") ||
        err.message?.includes("balance") ||
        err.message?.includes("underflow") ||
        err.code === "INSUFFICIENT_FUNDS"
      ) {
        userFriendlyMessage =
          "Insufficient MATIC balance. Please ensure you have enough MATIC in your wallet";
      } else if (err.message?.includes("user rejected signing")) {
        userFriendlyMessage = "You rejected the transaction signature";
      } else if (err.message?.includes("invalid address")) {
        userFriendlyMessage = "Invalid recipient address";
      } else if (err.code === -32603 || err.message?.includes("JSON-RPC")) {
        userFriendlyMessage =
          "Transaction failed. Please check your wallet and try again.";
      }

      toast.error(userFriendlyMessage, {
        autoClose: 5000,
      });

      setError(userFriendlyMessage);
    } finally {
      setIsDonating(false);
    }
  };

  if (isLoadingAddress) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <p>Loading wallet information...</p>
      </div>
    );
  }

  if (!recipientAddress) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Donate with MATIC
        </h2>
        <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded-md">
          <p>The creator hasn&apos;t set up a Polygon wallet address.</p>

          <p className="mt-2">
            <Link
              href={`/cause/${params.cause_id}/payment`}
              className="text-purple-600 hover:underline"
            >
              Please use another payment method
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Donate with MATIC
      </h2>

      <div className="mb-4">
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Amount (MATIC)
        </label>
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">MATIC</span>
          </div>
          <input
            type="number"
            id="amount"
            min="0.01"
            step="0.01"
            value={donationAmount}
            onChange={handleMaticChange}
            className="block w-full pl-16 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isDonating}
          />
        </div>
      </div>

      <div className="mb-4">
        <label
          htmlFor="nairaAmount"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Amount (Naira)
        </label>
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">₦</span>
          </div>
          <input
            type="text"
            id="nairaAmount"
            value={formattedNairaEquivalent}
            onChange={handleNairaChange}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isDonating}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">Using Polygon Mainnet</p>
      </div>

      <button
        onClick={handleDonate}
        disabled={isDonating}
        className={`w-full py-2 px-4 rounded-md text-white font-medium ${
          isDonating ? "bg-blue-400" : "bg-purple-600 hover:bg-blue-700"
        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors`}
      >
        {isDonating ? "Processing..." : "Donate with MATIC"}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {txHash && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
          <p>Thank you for your donation!</p>
          <p className="mt-1 text-sm">
            Transaction:{" "}
            <a
              href={`https://polygonscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-800"
            >
              View on PolygonScan
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
