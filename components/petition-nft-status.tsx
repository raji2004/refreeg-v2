"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Image as ImageIcon, CheckCircle, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PetitionNFTStatusProps {
  petitionId: string;
  userId?: string;
}

interface NFTStatus {
  hasSigned: boolean;
  nftEnabled: boolean;
  tokenId?: string;
  txHash?: string;
  contractAddress?: string;
  network?: string;
  status: "not_signed" | "signed_no_nft" | "nft_pending" | "nft_minted";
}

export function PetitionNFTStatus({ petitionId, userId }: PetitionNFTStatusProps) {
  const [nftStatus, setNftStatus] = useState<NFTStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadNFTStatus();
    }
  }, [petitionId, userId]);

  const loadNFTStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/petition-nft-status?petitionId=${petitionId}&userId=${userId}`);
      const data = await response.json();
      setNftStatus(data.status);
    } catch (error) {
      console.error("Error loading NFT status:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "nft_minted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "nft_pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <ImageIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "nft_minted":
        return "bg-green-100 text-green-800";
      case "nft_pending":
        return "bg-yellow-100 text-yellow-800";
      case "signed_no_nft":
        return "bg-blue-100 text-blue-800";
      case "not_signed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "nft_minted":
        return "NFT Minted";
      case "nft_pending":
        return "NFT Pending";
      case "signed_no_nft":
        return "Signed (No NFT)";
      case "not_signed":
        return "Not Signed";
      default:
        return "Unknown";
    }
  };

  const getNetworkExplorerUrl = (network: string, txHash: string) => {
    switch (network) {
      case "polygon_mainnet":
        return `https://polygonscan.com/tx/${txHash}`;
      case "polygon_amoy":
        return `https://amoy.polygonscan.com/tx/${txHash}`;
      case "ethereum_mainnet":
        return `https://etherscan.io/tx/${txHash}`;
      default:
        return `https://polygonscan.com/tx/${txHash}`;
    }
  };

  const getOpenSeaUrl = (contractAddress: string, tokenId: string, network: string) => {
    const chain = network === "polygon_mainnet" ? "matic" : "ethereum";
    return `https://opensea.io/assets/${chain}/${contractAddress}/${tokenId}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nftStatus || !nftStatus.nftEnabled) {
    return null; // Don't show NFT status if NFTs are not enabled for this petition
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <ImageIcon className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg text-purple-800">NFT Status</CardTitle>
          <Badge className={getStatusColor(nftStatus.status)}>
            <div className="flex items-center gap-1">
              {getStatusIcon(nftStatus.status)}
              {getStatusText(nftStatus.status)}
            </div>
          </Badge>
        </div>
        <CardDescription className="text-purple-700">
          {nftStatus.status === "nft_minted" 
            ? "You've received an NFT as proof of your signature!"
            : nftStatus.status === "nft_pending"
            ? "Your NFT is being minted. This may take a few minutes."
            : nftStatus.status === "signed_no_nft"
            ? "You've signed this petition, but NFT minting is not available."
            : "Sign this petition to receive a unique NFT!"
          }
        </CardDescription>
      </CardHeader>
      
      {nftStatus.status === "nft_minted" && nftStatus.tokenId && nftStatus.txHash && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-medium text-purple-700">Token ID</label>
              <p className="text-purple-800">#{nftStatus.tokenId}</p>
            </div>
            <div>
              <label className="font-medium text-purple-700">Network</label>
              <p className="text-purple-800 capitalize">
                {nftStatus.network?.replace('_', ' ') || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {nftStatus.txHash && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                asChild
              >
                <a
                  href={getNetworkExplorerUrl(nftStatus.network || "polygon_mainnet", nftStatus.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Transaction
                </a>
              </Button>
            )}
            {nftStatus.contractAddress && nftStatus.tokenId && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                asChild
              >
                <a
                  href={getOpenSeaUrl(nftStatus.contractAddress, nftStatus.tokenId, nftStatus.network || "polygon_mainnet")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on OpenSea
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
