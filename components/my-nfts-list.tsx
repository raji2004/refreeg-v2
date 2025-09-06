"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, CheckCircle, Clock, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface NFT {
  id: string;
  tokenId: string;
  petitionId: string;
  petitionTitle: string;
  imageUrl: string;
  contractAddress: string;
  network: string;
  mintedAt: string;
  transactionHash: string;
  status: "minted" | "pending" | "failed";
}

interface MyNFTsListProps {
  userId: string;
}

export function MyNFTsList({ userId }: MyNFTsListProps) {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadUserNFTs();
  }, [userId]);

  const loadUserNFTs = async () => {
    try {
      setLoading(true);
      // This would fetch from your API endpoint
      const response = await fetch(`/api/user-nfts?userId=${userId}`);
      const data = await response.json();
      setNfts(data.nfts || []);
    } catch (error) {
      console.error("Error loading NFTs:", error);
      toast({
        title: "Error",
        description: "Failed to load your NFTs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "minted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <CheckCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "minted":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No NFTs yet</h3>
          <p className="text-muted-foreground text-center mb-4">
            You haven't signed any petitions with NFT support yet. When you sign a petition that has NFTs enabled, 
            you'll receive a unique NFT as proof of your signature.
          </p>
          <Button asChild>
            <a href="/petitions">Browse Petitions</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Your Petition NFTs</h2>
          <p className="text-sm text-muted-foreground">
            {nfts.length} NFT{nfts.length !== 1 ? 's' : ''} from petition signatures
          </p>
        </div>
        <Button variant="outline" onClick={loadUserNFTs}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {nfts.map((nft) => (
          <Card key={nft.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {nft.petitionTitle}
                  </CardTitle>
                  <CardDescription>
                    Token ID: #{nft.tokenId}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(nft.status)}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(nft.status)}
                    {nft.status}
                  </div>
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* NFT Image */}
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                {nft.imageUrl ? (
                  <img
                    src={nft.imageUrl}
                    alt={`NFT for ${nft.petitionTitle}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Contract Address */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Contract Address
                </label>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                    {nft.contractAddress}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(nft.contractAddress, `contract-${nft.id}`)}
                  >
                    {copiedId === `contract-${nft.id}` ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Transaction Hash */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Transaction Hash
                </label>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                    {nft.transactionHash}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(nft.transactionHash, `tx-${nft.id}`)}
                  >
                    {copiedId === `tx-${nft.id}` ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <a
                    href={getNetworkExplorerUrl(nft.network, nft.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Explorer
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <a
                    href={getOpenSeaUrl(nft.contractAddress, nft.tokenId, nft.network)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on OpenSea
                  </a>
                </Button>
              </div>

              {/* Minted Date */}
              <div className="text-xs text-muted-foreground">
                Minted: {new Date(nft.mintedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
