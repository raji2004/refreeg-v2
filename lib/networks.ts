export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
}

export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  // Mainnets
  ethereum: {
    chainId: 1,
    name: "Ethereum",
    rpcUrl: "https://eth.llamarpc.com",
    blockExplorer: "https://etherscan.io",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: false,
  },
  polygon: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon.llamarpc.com",
    blockExplorer: "https://polygonscan.com",
    nativeCurrency: {
      name: "Polygon",
      symbol: "MATIC",
      decimals: 18,
    },
    isTestnet: false,
  },
  bsc: {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: "https://bsc.llamarpc.com",
    blockExplorer: "https://bscscan.com",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    isTestnet: false,
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arbitrum.llamarpc.com",
    blockExplorer: "https://arbiscan.io",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: false,
  },
  optimism: {
    chainId: 10,
    name: "Optimism",
    rpcUrl: "https://optimism.llamarpc.com",
    blockExplorer: "https://optimistic.etherscan.io",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: false,
  },
  base: {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://base.llamarpc.com",
    blockExplorer: "https://basescan.org",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: false,
  },
  avalanche: {
    chainId: 43114,
    name: "Avalanche",
    rpcUrl: "https://avalanche.llamarpc.com",
    blockExplorer: "https://snowtrace.io",
    nativeCurrency: {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
    },
    isTestnet: false,
  },
  fantom: {
    chainId: 250,
    name: "Fantom",
    rpcUrl: "https://fantom.llamarpc.com",
    blockExplorer: "https://ftmscan.com",
    nativeCurrency: {
      name: "Fantom",
      symbol: "FTM",
      decimals: 18,
    },
    isTestnet: false,
  },
  // Testnets
  sepolia: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: "https://sepolia.llamarpc.com",
    blockExplorer: "https://sepolia.etherscan.io",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
    isTestnet: true,
  },
  "polygon-amoy": {
    chainId: 80002,
    name: "Polygon Amoy",
    rpcUrl: "https://rpc-amoy.polygon.technology",
    blockExplorer: "https://amoy.polygonscan.com",
    nativeCurrency: {
      name: "Polygon",
      symbol: "MATIC",
      decimals: 18,
    },
    isTestnet: true,
  },
};

export const DEFAULT_NETWORK = "sepolia";

export const getNetworkByChainId = (chainId: number): NetworkConfig | null => {
  return Object.values(SUPPORTED_NETWORKS).find(network => network.chainId === chainId) || null;
};

export const getNetworkByKey = (key: string): NetworkConfig | null => {
  return SUPPORTED_NETWORKS[key] || null;
};
