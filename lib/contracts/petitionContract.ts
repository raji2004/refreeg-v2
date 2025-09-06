import { ethers } from 'ethers';

// Contract ABI - this will be generated after compilation
export const PETITION_NFT_ABI = [
  "function createPetition(string memory _title, string memory _description) external returns (uint256)",
  "function signPetition(uint256 _petitionId, string memory _message) external returns (uint256)",
  "function getPetition(uint256 _petitionId) external view returns (tuple(uint256 id, string title, string description, address creator, uint256 createdAt, bool isActive, uint256 signatureCount))",
  "function getSignature(uint256 _tokenId) external view returns (tuple(uint256 petitionId, address signer, string message, uint256 timestamp, bool verified))",
  "function getUserSignatures(address _user) external view returns (uint256[] memory)",
  "function getPetitionSignatures(uint256 _petitionId) external view returns (uint256[] memory)",
  "function deactivatePetition(uint256 _petitionId) external",
  "event PetitionCreated(uint256 indexed petitionId, address indexed creator, string title)",
  "event PetitionSigned(uint256 indexed petitionId, address indexed signer, uint256 indexed tokenId)"
];

// Contract configuration
export const CONTRACT_CONFIG = {
  polygonAmoy: {
    chainId: 80002,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    contractAddress: '', // Will be set after deployment
    blockExplorer: 'https://amoy.polygonscan.com'
  }
};

export class PetitionContract {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private signer: ethers.Signer | null = null;

  constructor(contractAddress: string, provider: ethers.Provider, signer?: ethers.Signer) {
    this.contract = new ethers.Contract(contractAddress, PETITION_NFT_ABI, provider);
    this.provider = provider;
    this.signer = signer || null;
  }

  // Connect wallet
  async connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      this.contract = this.contract.connect(signer);
      this.signer = signer;
      return signer;
    }
    throw new Error('MetaMask not found');
  }

  // Create a new petition
  async createPetition(title: string, description: string) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const tx = await this.contract.createPetition(title, description);
    const receipt = await tx.wait();
    
    // Get the petition ID from the event
    const event = receipt.logs.find(log => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'PetitionCreated';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = this.contract.interface.parseLog(event);
      return {
        petitionId: parsed?.args.petitionId.toString(),
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    }

    throw new Error('Failed to get petition ID from transaction');
  }

  // Sign a petition
  async signPetition(petitionId: number, message: string) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const tx = await this.contract.signPetition(petitionId, message);
    const receipt = await tx.wait();
    
    // Get the token ID from the event
    const event = receipt.logs.find(log => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'PetitionSigned';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = this.contract.interface.parseLog(event);
      return {
        tokenId: parsed?.args.tokenId.toString(),
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    }

    throw new Error('Failed to get token ID from transaction');
  }

  // Get petition details
  async getPetition(petitionId: number) {
    const petition = await this.contract.getPetition(petitionId);
    return {
      id: petition.id.toString(),
      title: petition.title,
      description: petition.description,
      creator: petition.creator,
      createdAt: new Date(Number(petition.createdAt) * 1000),
      isActive: petition.isActive,
      signatureCount: Number(petition.signatureCount)
    };
  }

  // Get signature details
  async getSignature(tokenId: number) {
    const signature = await this.contract.getSignature(tokenId);
    return {
      petitionId: signature.petitionId.toString(),
      signer: signature.signer,
      message: signature.message,
      timestamp: new Date(Number(signature.timestamp) * 1000),
      verified: signature.verified
    };
  }

  // Get user's signatures
  async getUserSignatures(userAddress: string) {
    const tokenIds = await this.contract.getUserSignatures(userAddress);
    return tokenIds.map(id => id.toString());
  }

  // Get petition signatures
  async getPetitionSignatures(petitionId: number) {
    const tokenIds = await this.contract.getPetitionSignatures(petitionId);
    return tokenIds.map(id => id.toString());
  }

  // Deactivate petition
  async deactivatePetition(petitionId: number) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const tx = await this.contract.deactivatePetition(petitionId);
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  // Get contract address
  getContractAddress(): string {
    return this.contract.target as string;
  }

  // Get current signer address
  async getSignerAddress(): Promise<string | null> {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  }
}
