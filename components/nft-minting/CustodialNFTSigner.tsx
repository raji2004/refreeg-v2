"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, ExternalLink, Wallet } from "lucide-react";

// Helper functions for explorer URLs
const getExplorerUrl = (network: string, type: 'tx' | 'address', hash: string): string => {
  const explorers = {
    polygon: 'https://polygonscan.com',
    ethereum: 'https://etherscan.io',
    bsc: 'https://bscscan.com',
    arbitrum: 'https://arbiscan.io',
    optimism: 'https://optimistic.etherscan.io',
    base: 'https://basescan.org',
    avalanche: 'https://snowtrace.io',
    solana: 'https://explorer.solana.com'
  };
  
  const baseUrl = explorers[network as keyof typeof explorers] || explorers.polygon;
  return `${baseUrl}/${type}/${hash}`;
};

const getExplorerName = (network: string): string => {
  const names = {
    polygon: 'PolygonScan',
    ethereum: 'Etherscan',
    bsc: 'BSCScan',
    arbitrum: 'Arbiscan',
    optimism: 'Optimism Explorer',
    base: 'BaseScan',
    avalanche: 'Snowtrace',
    solana: 'Solana Explorer'
  };
  
  return names[network as keyof typeof names] || 'Explorer';
};

const getOpenSeaUrl = (network: string, contractAddress: string, tokenId: string): string | null => {
  if (network === 'solana') return null; // Solana doesn't use OpenSea
  
  const slugs = {
    polygon: 'matic',
    ethereum: 'ethereum',
    bsc: 'bsc',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
    base: 'base',
    avalanche: 'avalanche'
  };
  
  const slug = slugs[network as keyof typeof slugs];
  if (!slug) return null;
  
  return `https://opensea.io/assets/${slug}/${contractAddress}/${tokenId}`;
};

interface CustodialNFTSignerProps {
  petitionId: string;
  petitionTitle: string;
  onNFTMinted?: (tokenId: string, txHash: string) => void;
  network?: string;
  contractAddress?: string;
}

export function CustodialNFTSigner({ 
  petitionId, 
  petitionTitle,
  onNFTMinted,
  network = 'polygon',
  contractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0x6c52c4bc5c182bae9228ffe203cc16132764f1de'
}: CustodialNFTSignerProps) {
  const [message, setMessage] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintedNFT, setMintedNFT] = useState<{ tokenId: string; txHash: string; network?: string; contractAddress?: string } | null>(null);
  const { toast } = useToast();

  const handleMintNFT = async () => {
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
      const response = await fetch('/api/mint-petition-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          petitionId,
          message: message.trim()
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to mint NFT");
      }

      setMintedNFT({
        tokenId: result.signature.tokenId,
        txHash: result.signature.txHash,
        network: result.signature.network || network,
        contractAddress: result.signature.contractAddress || contractAddress
      });

      toast({
        title: "NFT Minted Successfully! 🎉",
        description: `Your petition signature NFT has been minted with Token ID: ${result.signature.tokenId}`,
      });

      onNFTMinted?.(result.signature.tokenId, result.signature.txHash);

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
            Your petition signature has been recorded as an NFT on the blockchain using our custodial wallet.
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
              onClick={() => {
                const explorerUrl = getExplorerUrl(mintedNFT.network || network, 'tx', mintedNFT.txHash);
                window.open(explorerUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on {getExplorerName(mintedNFT.network || network)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const openseaUrl = getOpenSeaUrl(mintedNFT.network || network, mintedNFT.contractAddress || contractAddress, mintedNFT.tokenId);
                if (openseaUrl) {
                  window.open(openseaUrl, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on OpenSea
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Sign Petition & Mint NFT
        </CardTitle>
        <CardDescription>
          Sign the petition "{petitionTitle}" and receive a unique NFT as proof of your signature. 
          <strong> No wallet required!</strong> We'll handle the blockchain transaction for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
          <p><strong>✨ Custodial Service:</strong> We use our secure wallet to mint NFTs on your behalf. 
          You don't need MetaMask or any crypto wallet!</p>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">
            Your Message (Required)
          </label>
          <Textarea
            id="message"
            placeholder="Add a message to your petition signature..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            required
          />
        </div>

        <Button
          onClick={handleMintNFT}
          disabled={isMinting || !message.trim()}
          className="w-full"
        >
          {isMinting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Minting NFT...
            </>
          ) : (
            "Sign Petition & Mint NFT (No Wallet Required)"
          )}
        </Button>

        <div className="text-xs text-gray-500 text-center">
          <p>This will create a unique NFT on Polygon blockchain using our custodial wallet</p>
          <p>Contract: <span className="font-mono">{contractAddress}</span></p>
        </div>
      </CardContent>
    </Card>
  );
}
