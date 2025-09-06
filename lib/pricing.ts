export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  exchangeRate?: number; // Optional fallback rate
}

export interface PricingData {
  [symbol: string]: number; // symbol -> NGN rate
}

// Cache for pricing data
let pricingCache: PricingData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getTokenPrice(symbol: string): Promise<number> {
  try {
    // Check cache first
    if (pricingCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return pricingCache[symbol] || getFallbackRate(symbol);
    }

    // Fetch fresh pricing data
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${getCoinGeckoId(symbol)}&vs_currencies=ngn`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch price for ${symbol}, using fallback`);
      return getFallbackRate(symbol);
    }

    const data = await response.json();
    const coinId = getCoinGeckoId(symbol);
    const price = data[coinId]?.ngn;

    if (!price) {
      console.warn(`No price data for ${symbol}, using fallback`);
      return getFallbackRate(symbol);
    }

    // Update cache
    pricingCache = { ...pricingCache, [symbol]: price };
    cacheTimestamp = Date.now();

    return price;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return getFallbackRate(symbol);
  }
}

function getCoinGeckoId(symbol: string): string {
  const mapping: Record<string, string> = {
    'ETH': 'ethereum',
    'MATIC': 'matic-network',
    'BNB': 'binancecoin',
    'AVAX': 'avalanche-2',
    'FTM': 'fantom',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'SOL': 'solana',
  };
  return mapping[symbol] || symbol.toLowerCase();
}

function getFallbackRate(symbol: string): number {
  const fallbackRates: Record<string, number> = {
    'ETH': 450000,
    'MATIC': 413,
    'BNB': 180000,
    'AVAX': 18000,
    'FTM': 200,
    'USDC': 1500,
    'USDT': 1500,
    'SOL': 180000,
  };
  return fallbackRates[symbol] || 1000;
}

export async function getTokensWithPricing(networkKey: string): Promise<TokenInfo[]> {
  const baseTokens = getBaseTokensForNetwork(networkKey);
  
  // Fetch prices for all tokens in parallel
  const pricingPromises = baseTokens.map(async (token) => {
    const price = await getTokenPrice(token.symbol);
    return {
      ...token,
      exchangeRate: price,
    };
  });

  return Promise.all(pricingPromises);
}

// Base token definitions without pricing
function getBaseTokensForNetwork(networkKey: string): Omit<TokenInfo, 'exchangeRate'>[] {
  const NETWORK_TOKENS: Record<string, Omit<TokenInfo, 'exchangeRate'>[]> = {
    ethereum: [
      {
        address: "0x0000000000000000000000000000000000000000",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
      },
      {
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
      {
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
      },
    ],
    polygon: [
      {
        address: "0x0000000000000000000000000000000000000000",
        symbol: "MATIC",
        name: "Polygon",
        decimals: 18,
      },
      {
        address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
      {
        address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        symbol: "USDT",
        name: "Tether USD",
        decimals: 6,
      },
    ],
    bsc: [
      {
        address: "0x0000000000000000000000000000000000000000",
        symbol: "BNB",
        name: "BNB",
        decimals: 18,
      },
      {
        address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 18,
      },
      {
        address: "0x55d398326f99059fF775485246999027B3197955",
        symbol: "USDT",
        name: "Tether USD",
        decimals: 18,
      },
    ],
    arbitrum: [
      {
        address: "0x0000000000000000000000000000000000000000",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
      },
      {
        address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
    ],
    optimism: [
      {
        address: "0x0000000000000000000000000000000000000000",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
      },
      {
        address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
    ],
    base: [
      {
        address: "0x0000000000000000000000000000000000000000",
        symbol: "ETH",
        name: "Ethereum",
        decimals: 18,
      },
      {
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
    ],
    avalanche: [
      {
        address: "0x0000000000000000000000000000000000000000",
        symbol: "AVAX",
        name: "Avalanche",
        decimals: 18,
      },
      {
        address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
    ],
    fantom: [
      {
        address: "0x0000000000000000000000000000000000000000",
        symbol: "FTM",
        name: "Fantom",
        decimals: 18,
      },
      {
        address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
      },
    ],
    sepolia: [
      {
        address: "0x0000000000000000000000000000000000000000",
        symbol: "ETH",
        name: "Sepolia Ether",
        decimals: 18,
      },
      {
        address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
        symbol: "USDC",
        name: "USD Coin (Test)",
        decimals: 6,
      },
    ],
    "polygon-amoy": [
      {
        address: "0x0000000000000000000000000000000000000000",
        symbol: "MATIC",
        name: "Polygon (Test)",
        decimals: 18,
      },
      {
        address: "0x41E94Eb019C0762f9BfF9f2f3fF0f0079fd5d0C",
        symbol: "USDC",
        name: "USD Coin (Test)",
        decimals: 6,
      },
    ],
  };

  return NETWORK_TOKENS[networkKey] || [];
}

// Legacy function for backward compatibility
export const getTokensForNetwork = (networkKey: string): TokenInfo[] => {
  const baseTokens = getBaseTokensForNetwork(networkKey);
  return baseTokens.map(token => ({
    ...token,
    exchangeRate: getFallbackRate(token.symbol),
  }));
};

export const getNativeToken = (networkKey: string): TokenInfo | null => {
  const tokens = getTokensForNetwork(networkKey);
  return tokens.find(token => token.address === "0x0000000000000000000000000000000000000000") || null;
};
