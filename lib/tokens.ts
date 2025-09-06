export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  exchangeRate?: number; // Rate to NGN for display
}

export interface NetworkTokens {
  [networkKey: string]: TokenInfo[];
}

// Common token contracts for different networks
export const NETWORK_TOKENS: NetworkTokens = {
  ethereum: [
    {
      address: "0x0000000000000000000000000000000000000000", // ETH
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      exchangeRate: 3500000,
    },
    {
      address: "0xA0b86a33E6441b8c4C8C0d4Cecc0fA193c329786", // USDC
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
    {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      exchangeRate: 1500,
    },
    {
      address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
      exchangeRate: 1500,
    },
  ],
  polygon: [
    {
      address: "0x0000000000000000000000000000000000000000", // MATIC
      symbol: "MATIC",
      name: "Polygon",
      decimals: 18,
      exchangeRate: 413,
    },
    {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
    {
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      exchangeRate: 1500,
    },
    {
      address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", // DAI
      symbol: "DAI",
      name: "Dai Stablecoin",
      decimals: 18,
      exchangeRate: 1500,
    },
  ],
  arbitrum: [
    {
      address: "0x0000000000000000000000000000000000000000", // ETH
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      exchangeRate: 3500000,
    },
    {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
    {
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  optimism: [
    {
      address: "0x0000000000000000000000000000000000000000", // ETH
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      exchangeRate: 3500000,
    },
    {
      address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
    {
      address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", // USDT
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  base: [
    {
      address: "0x0000000000000000000000000000000000000000", // ETH
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      exchangeRate: 3500000,
    },
    {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  bsc: [
    {
      address: "0x0000000000000000000000000000000000000000", // BNB
      symbol: "BNB",
      name: "BNB",
      decimals: 18,
      exchangeRate: 250000,
    },
    {
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
      symbol: "USDC",
      name: "USD Coin",
      decimals: 18,
      exchangeRate: 1500,
    },
    {
      address: "0x55d398326f99059fF775485246999027B3197955", // USDT
      symbol: "USDT",
      name: "Tether USD",
      decimals: 18,
      exchangeRate: 1500,
    },
  ],
  avalanche: [
    {
      address: "0x0000000000000000000000000000000000000000", // AVAX
      symbol: "AVAX",
      name: "Avalanche",
      decimals: 18,
      exchangeRate: 150000,
    },
    {
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // USDC
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
    {
      address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // USDT
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  fantom: [
    {
      address: "0x0000000000000000000000000000000000000000", // FTM
      symbol: "FTM",
      name: "Fantom",
      decimals: 18,
      exchangeRate: 500,
    },
    {
      address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", // USDC
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  sepolia: [
    {
      address: "0x0000000000000000000000000000000000000000", // ETH
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      exchangeRate: 3500000,
    },
    {
      address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // USDC (Sepolia testnet)
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
    {
      address: "0x7169D38820dfd117C3FA1f22a697dba58d90BA06", // USDT (Sepolia testnet)
      symbol: "USDT",
      name: "Tether USD",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
  polygonAmoy: [
    {
      address: "0x0000000000000000000000000000000000000000", // MATIC
      symbol: "MATIC",
      name: "Polygon",
      decimals: 18,
      exchangeRate: 413,
    },
    {
      address: "0x41E94Eb019C0742fB612F4A6C0C4c5C3E4d4d4d4", // USDC (Polygon Amoy testnet)
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      exchangeRate: 1500,
    },
  ],
};

// ERC-20 ABI for token balance checking
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
];

export function getTokensForNetwork(networkKey: string): TokenInfo[] {
  return NETWORK_TOKENS[networkKey] || [];
}

export function getTokenByAddress(networkKey: string, address: string): TokenInfo | undefined {
  const tokens = getTokensForNetwork(networkKey);
  return tokens.find(token => token.address.toLowerCase() === address.toLowerCase());
}
