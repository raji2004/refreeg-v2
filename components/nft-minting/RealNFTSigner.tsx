"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2, CheckCircle, Wallet } from "lucide-react";
import { ethers } from "ethers";

// Contract ABI for PetitionNFT
const CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "_petitionId", "type": "uint256"},
      {"internalType": "string", "name": "_message", "type": "string"}
    ],
    "name": "signPetition",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const CONTRACT_ADDRESS = "0x96b7cbfB002bc9c30c5BF28C18821F60FAfF595b";
const POLYGON_CHAIN_ID = "0x89"; // Polygon mainnet

interface RealNFTSignerProps {
  petitionId: string;
  petitionTitle: string;
  onNFTMinted?: (tokenId: string, txHash: string) => void;
}

export function RealNFTSigner({ 
  petitionId, 
  petitionTitle,
  onNFTMinted 
}: RealNFTSignerProps) {
  const [message, setMessage] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [mintedNFT, setMintedNFT] = useState<{ tokenId: string; txHash: string } | null>(null);
  const { toast } = useToast();

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== "undefined" && typeof window.ethereum !== "undefined";

  useEffect(() => {
    if (isMetaMaskInstalled) {
      checkConnection();
    }
  }, [isMetaMaskInstalled]);

  const checkConnection = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0].address);
      }
    } catch (error) {
      console.log("No wallet connected");
    }
  };

  const connectWallet = async () => {
    if (!isMetaMaskInstalled) {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask to connect your wallet.",
        variant: "destructive"
      });
      return;
    }

    setIsConnecting(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        
        // Check if we're on Polygon network
        const network = await provider.getNetwork();
        if (network.chainId !== BigInt(137)) { // Polygon mainnet chain ID
          toast({
            title: "Wrong Network",
            description: "Please switch to Polygon network in MetaMask.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleMintNFT = async () => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first.",
        variant: "destructive"
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message for your petition signature.",
        variant: "destructive"
      });
      return;
    }

    setIsMinting(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Convert petitionId to number (assuming it's a UUID, we'll use a hash)
      const petitionIdNumber = parseInt(petitionId.replace(/-/g, '').substring(0, 8), 16);

      // Call the signPetition function
      const tx = await contract.signPetition(petitionIdNumber, message.trim());
      
      toast({
        title: "Transaction Submitted",
        description: "Your NFT minting transaction has been submitted. Please wait for confirmation.",
      });

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Get the token ID from the event logs
        const event = receipt.logs.find((log: any) => 
          log.topics[0] === ethers.id("PetitionSigned(uint256,address,uint256)")
        );
        
        let tokenId = "1"; // Default fallback
        if (event) {
          tokenId = ethers.getBigInt(event.topics[3]).toString();
        }

        setMintedNFT({
          tokenId,
          txHash: receipt.transactionHash
        });

        // Record the NFT minting in the database
        try {
          const response = await fetch('/api/record-nft-minting', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              petitionId,
              signerAddress: account,
              tokenId,
              txHash: receipt.transactionHash,
              message: message.trim()
            })
          });

          if (!response.ok) {
            console.error('Failed to record NFT in database');
          }
        } catch (error) {
          console.error('Error recording NFT in database:', error);
        }

        toast({
          title: "NFT Minted Successfully! 🎉",
          description: `Your petition signature NFT has been minted with Token ID: ${tokenId}`,
        });

        onNFTMinted?.(tokenId, receipt.transactionHash);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      console.error("Error minting NFT:", error);
      toast({
        title: "Minting Failed",
        description: error instanceof Error ? error.message : "Failed to mint NFT. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsMinting(false);
    }
  };

  if (mintedNFT) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            NFT Minted Successfully!
          </CardTitle>
          <CardDescription>
            Your petition signature has been recorded as an NFT on the blockchain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Token ID:</span>
              <p className="text-gray-600">{mintedNFT.tokenId}</p>
            </div>
            <div>
              <span className="font-medium">Transaction:</span>
              <p className="text-gray-600 font-mono text-xs break-all">
                {mintedNFT.txHash}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://polygonscan.com/tx/${mintedNFT.txHash}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on PolygonScan
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://opensea.io/assets/matic/${CONTRACT_ADDRESS}/${mintedNFT.tokenId}`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on OpenSea
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isMetaMaskInstalled) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Wallet className="h-5 w-5" />
            MetaMask Required
          </CardTitle>
          <CardDescription>
            Please install MetaMask to mint NFTs for petition signatures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => window.open("https://metamask.io/download/", "_blank")}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Install MetaMask
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!account) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect Wallet to Mint NFT</CardTitle>
          <CardDescription>
            Connect your MetaMask wallet to sign the petition and mint a unique NFT.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect MetaMask
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign Petition & Mint NFT</CardTitle>
        <CardDescription>
          Sign the petition "{petitionTitle}" and receive a unique NFT as proof of your signature.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>Connected: <span className="font-mono">{account}</span></p>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            Your Message (Optional)
          </label>
          <Textarea
            id="message"
            placeholder="Add a message to your petition signature..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          onClick={handleMintNFT}
          disabled={isMinting}
          className="w-full"
        >
          {isMinting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Minting NFT...
            </>
          ) : (
            "Sign Petition & Mint NFT"
          )}
        </Button>

        <div className="text-xs text-gray-500 text-center">
          <p>This will create a unique NFT on Polygon blockchain</p>
          <p>Contract: <span className="font-mono">{CONTRACT_ADDRESS}</span></p>
        </div>
      </CardContent>
    </Card>
  );
}
