"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { NETWORK_TOKENS, ERC20_ABI, TokenInfo } from "@/lib/tokens";
import { getNetworkByChainId } from "@/lib/networks";

interface TokenBalance extends TokenInfo {
  balance: string;
  balanceFormatted: string;
}

interface UseTokenBalancesReturn {
  tokens: TokenBalance[];
  isLoading: boolean;
  error: string | null;
  refreshBalances: () => Promise<void>;
}

export function useTokenBalances(
  address: string | null,
  chainId: string | null
): UseTokenBalancesReturn {
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNetworkKey = useCallback((chainId: string): string => {
    const network = getNetworkByChainId(chainId);
    if (!network) return "";
    
    // Map chain names to our network keys
    const nameMap: Record<string, string> = {
      "Ethereum": "ethereum",
      "Polygon": "polygon", 
      "Arbitrum": "arbitrum",
      "Optimism": "optimism",
      "Base": "base",
      "BSC": "bsc",
      "Avalanche": "avalanche",
      "Fantom": "fantom",
    };
    
    return nameMap[network.chainName] || "";
  }, []);

  const formatTokenBalance = useCallback((balance: string, decimals: number): string => {
    const balanceBN = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const formatted = Number(balanceBN) / Number(divisor);
    return formatted.toFixed(6);
  }, []);

  const checkTokenBalance = useCallback(async (
    provider: ethers.BrowserProvider,
    token: TokenInfo,
    userAddress: string
  ): Promise<TokenBalance | null> => {
    try {
      if (token.address === "0x0000000000000000000000000000000000000000") {
        // Native token (ETH, MATIC, etc.)
        const balance = await provider.getBalance(userAddress);
        const balanceFormatted = formatTokenBalance(balance.toString(), token.decimals);
        
        return {
          ...token,
          balance: balance.toString(),
          balanceFormatted,
        };
      } else {
        // ERC-20 token
        const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
        const balance = await contract.balanceOf(userAddress);
        const balanceFormatted = formatTokenBalance(balance.toString(), token.decimals);
        
        // Only return tokens with non-zero balance
        if (BigInt(balance) > 0) {
          return {
            ...token,
            balance: balance.toString(),
            balanceFormatted,
          };
        }
        return null;
      }
    } catch (error) {
      console.warn(`Error checking balance for ${token.symbol}:`, error);
      return null;
    }
  }, [formatTokenBalance]);

  const refreshBalances = useCallback(async () => {
    if (!address || !chainId || !window.ethereum) {
      setTokens([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const networkKey = getNetworkKey(chainId);
      if (!networkKey) {
        throw new Error("Unsupported network");
      }

      const availableTokens = NETWORK_TOKENS[networkKey];
      if (!availableTokens) {
        throw new Error("No tokens configured for this network");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const balancePromises = availableTokens.map(token => 
        checkTokenBalance(provider, token, address)
      );

      const results = await Promise.all(balancePromises);
      const validTokens = results.filter((token): token is TokenBalance => token !== null);

      // Sort by balance (highest first)
      validTokens.sort((a, b) => {
        const balanceA = parseFloat(a.balanceFormatted);
        const balanceB = parseFloat(b.balanceFormatted);
        return balanceB - balanceA;
      });

      setTokens(validTokens);
    } catch (err: any) {
      console.error("Error fetching token balances:", err);
      setError(err.message || "Failed to fetch token balances");
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, getNetworkKey, checkTokenBalance]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  return {
    tokens,
    isLoading,
    error,
    refreshBalances,
  };
}
