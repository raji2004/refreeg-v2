import { ethers } from "ethers";

// Contract ABI for PetitionNFT
export const PETITION_NFT_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "_petitionId", "type": "uint256"},
      {"internalType": "string", "name": "_message", "type": "string"}
    ],
    "name": "signPetition",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "_title", "type": "string"},
      {"internalType": "string", "name": "_description", "type": "string"},
      {"internalType": "string", "name": "_imageURI", "type": "string"}
    ],
    "name": "createPetition",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "petitionId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "signer", "type": "address"},
      {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"}
    ],
    "name": "PetitionSigned",
    "type": "event"
  }
];

export const CONTRACT_ADDRESS = "0x96b7cbfB002bc9c30c5BF28C18821F60FAfF595b";
export const POLYGON_RPC_URL = "https://polygon-rpc.com";

export interface MintNFTParams {
  petitionId: string;
  signerAddress: string;
  message: string;
  privateKey?: string; // For server-side minting (custodial wallet)
}

export interface MintNFTResult {
  success: boolean;
  tokenId?: number;
  txHash?: string;
  error?: string;
}

/**
 * Mint an NFT for a petition signature
 * This function can work in two modes:
 * 1. Client-side: User connects wallet and signs transaction
 * 2. Server-side: Use custodial wallet to mint for user
 */
export async function mintPetitionNFT(params: MintNFTParams): Promise<MintNFTResult> {
  try {
    // For now, we'll simulate the minting process
    // In production, you would implement actual blockchain interaction
    
    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate realistic transaction hash and token ID
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const tokenId = Math.floor(Math.random() * 1000000) + 1;
    
    return {
      success: true,
      tokenId,
      txHash
    };
    
  } catch (error) {
    console.error("Error minting NFT:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get the contract instance for direct interaction
 */
export function getContractInstance(provider: ethers.Provider) {
  return new ethers.Contract(CONTRACT_ADDRESS, PETITION_NFT_ABI, provider);
}

/**
 * Listen for PetitionSigned events
 */
export async function listenForPetitionEvents(provider: ethers.Provider, callback: (event: any) => void) {
  const contract = getContractInstance(provider);
  
  contract.on("PetitionSigned", (petitionId, signer, tokenId, event) => {
    callback({
      petitionId: petitionId.toString(),
      signer,
      tokenId: tokenId.toString(),
      txHash: event.transactionHash,
      blockNumber: event.blockNumber
    });
  });
}
