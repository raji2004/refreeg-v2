export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  exchangeRate: number; // Mock exchange rate to NGN
}

export const NETWORK_TOKENS: Record<string, TokenInfo[]> = {
  // Ethereum Mainnet
  ethereum: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      exchangeRate: 450000,
    },
    {
      address: "0xA0b86a33E6441b8c4C8C0d4Cecc0fA193c329786",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
    {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  
  // Polygon Mainnet
  polygon: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "MATIC",
      name: "Polygon",
      decimals: 18,
      exchangeRate: 413,
    },
    {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
    {
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  
  // BSC Mainnet
  bsc: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "BNB",
      name: "BNB",
      decimals: 18,
      exchangeRate: 180000,
    },
    {
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 18,
      exchangeRate: 1500,
    },
    {
      address: "0x55d398326f99059fF775485246999027B3197955",
      symbol: "USDT",
      name: "Tether USD",
      decimals: 18,
      exchangeRate: 1500,
    },
  ],
  
  // Arbitrum Mainnet
  arbitrum: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      exchangeRate: 450000,
    },
    {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  
  // Optimism Mainnet
  optimism: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      exchangeRate: 450000,
    },
    {
      address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  
  // Base Mainnet
  base: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      exchangeRate: 450000,
    },
    {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  
  // Avalanche Mainnet
  avalanche: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "AVAX",
      name: "Avalanche",
      decimals: 18,
      exchangeRate: 18000,
    },
    {
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  
  // Fantom Mainnet
  fantom: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "FTM",
      name: "Fantom",
      decimals: 18,
      exchangeRate: 200,
    },
    {
      address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  
  // Testnets
  sepolia: [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "ETH",
      name: "Sepolia Ether",
      decimals: 18,
      exchangeRate: 450000,
    },
    {
      address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
      symbol: "USDC",
      name: "USD Coin (Test)",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  
  "polygon-amoy": [
    {
      address: "0x0000000000000000000000000000000000000000",
      symbol: "MATIC",
      name: "Polygon (Test)",
      decimals: 18,
      exchangeRate: 413,
    },
    {
      address: "0x41E94Eb019C0762f9BfF9f2f3fF0f0079fd5d0C",
      symbol: "USDC",
      name: "USD Coin (Test)",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
};

export const getTokensForNetwork = (networkKey: string): TokenInfo[] => {
  return NETWORK_TOKENS[networkKey] || [];
};

export const getNativeToken = (networkKey: string): TokenInfo | null => {
  const tokens = getTokensForNetwork(networkKey);
  return tokens.find(token => token.address === "0x0000000000000000000000000000000000000000") || null;
};
