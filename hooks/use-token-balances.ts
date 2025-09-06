"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getTokensForNetwork, TokenInfo } from "@/lib/tokens";
import { SUPPORTED_NETWORKS } from "@/lib/networks";

interface TokenBalance extends TokenInfo {
  balance: string;
  formattedBalance: string;
}

export function useTokenBalances(walletAddress: string | null, chainId: number | null) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalances = async () => {
    if (!walletAddress || !chainId) {
      setBalances([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = Object.values(SUPPORTED_NETWORKS).find(n => n.chainId === chainId);
      
      if (!network) {
        throw new Error("Unsupported network");
      }

      const tokens = getTokensForNetwork(Object.keys(SUPPORTED_NETWORKS).find(key => SUPPORTED_NETWORKS[key].chainId === chainId) || "");
      
      if (tokens.length === 0) {
        setBalances([]);
        return;
      }

      const balancePromises = tokens.map(async (token) => {
        try {
          let balance: bigint;
          
          if (token.address === "0x0000000000000000000000000000000000000000") {
            // Native token
            balance = await provider.getBalance(walletAddress);
          } else {
            // ERC-20 token
            const contract = new ethers.Contract(
              token.address,
              [
                "function balanceOf(address owner) view returns (uint256)",
                "function decimals() view returns (uint8)",
                "function symbol() view returns (string)",
                "function name() view returns (string)"
              ],
              provider
            );
            
            balance = await contract.balanceOf(walletAddress);
          }

          const formattedBalance = ethers.formatUnits(balance, token.decimals);
          
          return {
            ...token,
            balance: balance.toString(),
            formattedBalance: parseFloat(formattedBalance).toFixed(6),
          };
        } catch (err) {
          console.error(`Error fetching balance for ${token.symbol}:`, err);
          return {
            ...token,
            balance: "0",
            formattedBalance: "0.000000",
          };
        }
      });

      const tokenBalances = await Promise.all(balancePromises);
      
      // Filter out tokens with zero balance
      const nonZeroBalances = tokenBalances.filter(
        token => BigInt(token.balance) > 0
      );
      
      setBalances(nonZeroBalances);
    } catch (err) {
      console.error("Error fetching token balances:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch balances");
      setBalances([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshBalances();
  }, [walletAddress, chainId]);

  return {
    balances,
    isLoading,
    error,
    refreshBalances,
  };
}
