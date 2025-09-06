"use client";

import { useState, useEffect, useCallback } from "react";
import { SUPPORTED_NETWORKS, getNetworkByChainId, isTestnet } from "@/lib/networks";

interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: string | null;
  network: string | null;
  isMetaMaskInstalled: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface UseMultiWalletReturn extends WalletState {
  connect: (networkKey?: string) => Promise<void>;
  disconnect: () => void;
  switchNetwork: (networkKey: string) => Promise<void>;
  addNetwork: (networkKey: string) => Promise<void>;
  getBalance: (address?: string) => Promise<string>;
  getNetworkInfo: (chainId: string) => any;
}

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      selectedAddress: string | null;
      chainId: string | null;
    };
  }
}

export function useMultiWallet(): UseMultiWalletReturn {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    network: null,
    isMetaMaskInstalled: false,
    isConnecting: false,
    error: null,
  });

  // Check if MetaMask is installed
  useEffect(() => {
    const isInstalled = typeof window !== "undefined" && !!window.ethereum?.isMetaMask;
    setState(prev => ({ ...prev, isMetaMaskInstalled: isInstalled }));
  }, []);

  // Initialize wallet state
  useEffect(() => {
    if (!window.ethereum) return;

    const initializeWallet = async () => {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        const chainId = await window.ethereum.request({ method: "eth_chainId" });
        
        if (accounts.length > 0) {
          const network = getNetworkByChainId(chainId);
          setState(prev => ({
            ...prev,
            isConnected: true,
            address: accounts[0],
            chainId,
            network: network?.chainName || null,
          }));
        }
      } catch (error) {
        console.error("Error initializing wallet:", error);
      }
    };

    initializeWallet();

    // Listen for account changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState(prev => ({
          ...prev,
          isConnected: false,
          address: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isConnected: true,
          address: accounts[0],
        }));
      }
    };

    // Listen for chain changes
    const handleChainChanged = (chainId: string) => {
      const network = getNetworkByChainId(chainId);
      setState(prev => ({
        ...prev,
        chainId,
        network: network?.chainName || null,
      }));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  const connect = useCallback(async (networkKey?: string) => {
    if (!window.ethereum) {
      setState(prev => ({ ...prev, error: "MetaMask not installed" }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const network = getNetworkByChainId(chainId);

      // If a specific network is requested, switch to it
      if (networkKey && networkKey !== network?.chainName) {
        await switchNetwork(networkKey);
      }

      setState(prev => ({
        ...prev,
        isConnected: true,
        address,
        chainId,
        network: network?.chainName || null,
        isConnecting: false,
        error: null,
      }));
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || "Failed to connect wallet",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      address: null,
      chainId: null,
      network: null,
      error: null,
    }));
  }, []);

  const switchNetwork = useCallback(async (networkKey: string) => {
    if (!window.ethereum) {
      setState(prev => ({ ...prev, error: "MetaMask not installed" }));
      return;
    }

    const network = SUPPORTED_NETWORKS[networkKey];
    if (!network) {
      setState(prev => ({ ...prev, error: "Unsupported network" }));
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: network.chainId }],
      });
    } catch (error: any) {
      // If the network is not added to MetaMask, add it
      if (error.code === 4902) {
        await addNetwork(networkKey);
      } else {
        throw error;
      }
    }
  }, []);

  const addNetwork = useCallback(async (networkKey: string) => {
    if (!window.ethereum) {
      setState(prev => ({ ...prev, error: "MetaMask not installed" }));
      return;
    }

    const network = SUPPORTED_NETWORKS[networkKey];
    if (!network) {
      setState(prev => ({ ...prev, error: "Unsupported network" }));
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: network.chainId,
            chainName: network.chainName,
            nativeCurrency: network.nativeCurrency,
            rpcUrls: [network.rpcUrl],
            blockExplorerUrls: [network.blockExplorer],
          },
        ],
      });
    } catch (error: any) {
      console.error("Error adding network:", error);
      setState(prev => ({ ...prev, error: "Failed to add network" }));
    }
  }, []);

  const getBalance = useCallback(async (address?: string) => {
    if (!window.ethereum || !state.address) {
      throw new Error("Wallet not connected");
    }

    const targetAddress = address || state.address;
    const balance = await window.ethereum.request({
      method: "eth_getBalance",
      params: [targetAddress, "latest"],
    });

    // Convert from wei to ether
    return (parseInt(balance, 16) / Math.pow(10, 18)).toString();
  }, [state.address]);

  const getNetworkInfo = useCallback((chainId: string) => {
    return getNetworkByChainId(chainId);
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    addNetwork,
    getBalance,
    getNetworkInfo,
  };
}
