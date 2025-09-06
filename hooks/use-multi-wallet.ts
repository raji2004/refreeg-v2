"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { createClient } from "@/lib/supabase/client";
import { SUPPORTED_NETWORKS } from "@/lib/networks";

interface WalletInfo {
  address: string;
  network: string;
  chainId: number;
}

export function useMultiWallet() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      
      // Get current chain ID
      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      const chainIdNumber = parseInt(chainId, 16);
      const network = Object.keys(SUPPORTED_NETWORKS).find(
        key => SUPPORTED_NETWORKS[key].chainId === chainIdNumber
      );

      if (!network) {
        throw new Error("Unsupported network. Please switch to a supported network.");
      }

      const walletInfo: WalletInfo = {
        address,
        network,
        chainId: chainIdNumber,
      };

      setWalletInfo(walletInfo);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            crypto_wallets: {
              metamask_address: address,
            },
          })
          .eq("id", user.id);
      }

      return walletInfo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectSolana = async () => {
    if (!window.solana?.isPhantom) {
      throw new Error("Phantom wallet is not installed");
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await window.solana.connect();
      const address = response.publicKey.toString();

      const walletInfo: WalletInfo = {
        address,
        network: "solana",
        chainId: 0, // Solana doesn't use chainId
      };

      setWalletInfo(walletInfo);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            crypto_wallets: {
              solana_address: address,
            },
          })
          .eq("id", user.id);
      }

      return walletInfo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    setWalletInfo(null);
    setError(null);
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });

      // Update wallet info with new chain
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts && accounts.length > 0) {
        const network = Object.keys(SUPPORTED_NETWORKS).find(
          key => SUPPORTED_NETWORKS[key].chainId === targetChainId
        );

        if (network) {
          setWalletInfo({
            address: accounts[0],
            network,
            chainId: targetChainId,
          });
        }
      }
    } catch (err) {
      console.error("Error switching network:", err);
      throw new Error("Failed to switch network");
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setWalletInfo(null);
      } else if (walletInfo) {
        setWalletInfo({
          ...walletInfo,
          address: accounts[0],
        });
      }
    };

    const handleChainChanged = (chainId: string) => {
      const chainIdNumber = parseInt(chainId, 16);
      const network = Object.keys(SUPPORTED_NETWORKS).find(
        key => SUPPORTED_NETWORKS[key].chainId === chainIdNumber
      );

      if (network && walletInfo) {
        setWalletInfo({
          ...walletInfo,
          network,
          chainId: chainIdNumber,
        });
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [walletInfo]);

  return {
    walletInfo,
    isConnecting,
    error,
    connectMetaMask,
    connectSolana,
    disconnect,
    switchNetwork,
  };
}
