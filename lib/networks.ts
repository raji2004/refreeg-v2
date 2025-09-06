export interface NetworkConfig {
  chainId: string;
  chainName: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
  iconUrl?: string;
}

export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  ethereum: {
    chainId: '0x1',
    chainName: 'Ethereum',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://etherscan.io',
    iconUrl: '/images/ethereum-logo.png'
  },
  polygon: {
    chainId: '0x89',
    chainName: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorer: 'https://polygonscan.com',
    iconUrl: '/images/polygon-logo.png'
  },
  base: {
    chainId: '0x2105',
    chainName: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://basescan.org',
    iconUrl: '/images/base-logo.png'
  },
  arbitrum: {
    chainId: '0xa4b1',
    chainName: 'Arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://arbiscan.io',
    iconUrl: '/images/arbitrum-logo.png'
  },
  optimism: {
    chainId: '0xa',
    chainName: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://optimistic.etherscan.io',
    iconUrl: '/images/optimism-logo.png'
  },
  avalanche: {
    chainId: '0xa86a',
    chainName: 'Avalanche',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
    blockExplorer: 'https://snowtrace.io',
    iconUrl: '/images/avalanche-logo.png'
  },
  bsc: {
    chainId: '0x38',
    chainName: 'BSC',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockExplorer: 'https://bscscan.com',
    iconUrl: '/images/bsc-logo.png'
  },
  fantom: {
    chainId: '0xfa',
    chainName: 'Fantom',
    rpcUrl: 'https://rpc.ftm.tools',
    nativeCurrency: { name: 'Fantom', symbol: 'FTM', decimals: 18 },
    blockExplorer: 'https://ftmscan.com',
    iconUrl: '/images/fantom-logo.png'
  },
  // Testnets
  polygonAmoy: {
    chainId: '0x13882',
    chainName: 'Polygon Amoy Testnet',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorer: 'https://amoy.polygonscan.com',
    iconUrl: '/images/polygon-logo.png'
  },
  sepolia: {
    chainId: '0xaa36a7',
    chainName: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    nativeCurrency: { name: 'SepoliaETH', symbol: 'SepoliaETH', decimals: 18 },
    blockExplorer: 'https://sepolia.etherscan.io',
    iconUrl: '/images/ethereum-logo.png'
  }
};

export const DEFAULT_NETWORK = 'sepolia'; // Using testnet as default for safety

export function getNetworkByChainId(chainId: string): NetworkConfig | undefined {
  return Object.values(SUPPORTED_NETWORKS).find(network => network.chainId === chainId);
}

export function isTestnet(chainId: string): boolean {
  const testnetChainIds = ['0x13882', '0xaa36a7']; // Add more testnet chain IDs as needed
  return testnetChainIds.includes(chainId);
}
