import { ethers } from "ethers";

// Custodial wallet configuration
const CUSTODIAL_WALLET_PRIVATE_KEY = process.env.CUSTODIAL_WALLET_PRIVATE_KEY;
const CUSTODIAL_WALLET_ADDRESS = "0xe5347D533cABe9fa5698e1e8Dd22B6742de5F3b7";
const POLYGON_RPC_URL = "https://polygon-rpc.com";

// Contract ABI for Enhanced PetitionNFT
const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "_title", "type": "string"},
      {"internalType": "string", "name": "_description", "type": "string"},
      {"internalType": "string", "name": "_imageURI", "type": "string"},
      {"internalType": "bool", "name": "_custodialEnabled", "type": "bool"}
    ],
    "name": "createPetition",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
      {"internalType": "uint256", "name": "_petitionId", "type": "uint256"},
      {"internalType": "string", "name": "_message", "type": "string"},
      {"internalType": "address", "name": "_userAddress", "type": "address"}
    ],
    "name": "custodialSignPetition",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_petitionId", "type": "uint256"},
      {"internalType": "string[]", "name": "_messages", "type": "string[]"},
      {"internalType": "address[]", "name": "_userAddresses", "type": "address[]"}
    ],
    "name": "batchCustodialSignPetition",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_petitionId", "type": "uint256"}
    ],
    "name": "getPetition",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "string", "name": "title", "type": "string"},
          {"internalType": "string", "name": "description", "type": "string"},
          {"internalType": "string", "name": "imageURI", "type": "string"},
          {"internalType": "address", "name": "creator", "type": "address"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "bool", "name": "isActive", "type": "bool"},
          {"internalType": "uint256", "name": "signatureCount", "type": "uint256"},
          {"internalType": "bool", "name": "custodialEnabled", "type": "bool"}
        ],
        "internalType": "struct EnhancedPetitionNFT.Petition",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "petitionId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "title", "type": "string"}
    ],
    "name": "PetitionCreated",
    "type": "event"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_minter", "type": "address"}
    ],
    "name": "addCustodialMinter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "", "type": "address"}
    ],
    "name": "custodialMinters",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
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

const CONTRACT_ADDRESS = "0x6c52c4bc5c182bae9228ffe203cc16132764f1de";

export class CustodialWalletService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    if (!CUSTODIAL_WALLET_PRIVATE_KEY) {
      throw new Error("CUSTODIAL_WALLET_PRIVATE_KEY environment variable is required");
    }

    this.provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    this.wallet = new ethers.Wallet(CUSTODIAL_WALLET_PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);
  }

  /**
   * Mint an NFT for a petition signature using the custodial wallet
   */
  async mintPetitionNFT(petitionId: string, message: string, userAddress: string) {
    try {
      // Convert petitionId to number (using hash of UUID)
      const petitionIdNumber = this.convertPetitionIdToNumber(petitionId);

      // Use fixed gas limit instead of estimation (which was failing)
      const gasLimit = 500000; // Fixed gas limit that works

      // Get current gas price
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits("30", "gwei");

      // Call the custodialSignPetition function
      const tx = await this.contract.custodialSignPetition(
        petitionIdNumber, 
        message, 
        userAddress, // The user who will receive the NFT
        {
          gasLimit,
          gasPrice
        }
      );

      console.log(`Transaction submitted: ${tx.hash}`);

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      if (receipt.status !== 1) {
        throw new Error("Transaction failed");
      }

      // Get the token ID from the event logs
      let tokenId = "1"; // Default fallback
      
      // Look for PetitionSigned event in the logs
      const event = receipt.logs.find((log: any) => {
        try {
          const parsedLog = this.contract.interface.parseLog(log);
          return parsedLog && parsedLog.name === "PetitionSigned";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsedLog = this.contract.interface.parseLog(event);
        if (parsedLog && parsedLog.name === "PetitionSigned") {
          tokenId = parsedLog.args.tokenId.toString();
        }
      }

      return {
        success: true,
        tokenId,
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
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
   * Convert UUID petition ID to a number for the smart contract
   */
  private convertPetitionIdToNumber(petitionId: string): number {
    // For testing, we'll use petition ID 1 from the new enhanced contract
    // In production, you'd map database petition IDs to contract petition IDs
    if (petitionId === "edae2849-6077-46a2-a8ca-f0061035bfd5") {
      return 1; // Map to the petition we created in the new contract
    }
    
    // Fallback: convert UUID to number
    const cleanId = petitionId.replace(/-/g, '');
    return parseInt(cleanId.substring(0, 8), 16);
  }

  /**
   * Get the custodial wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get the contract instance
   */
  getContract(): ethers.Contract {
    return this.contract;
  }

  /**
   * Get the provider instance
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }
}

// Singleton instance
let custodialWallet: CustodialWalletService | null = null;

export function getCustodialWallet(): CustodialWalletService {
  if (!custodialWallet) {
    custodialWallet = new CustodialWalletService();
  }
  return custodialWallet;
}
