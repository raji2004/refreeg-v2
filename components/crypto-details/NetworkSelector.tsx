"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMultiWallet } from "@/hooks/use-multi-wallet";
import { SUPPORTED_NETWORKS, isTestnet } from "@/lib/networks";
import { Check, ExternalLink, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NetworkSelectorProps {
  onNetworkSelected?: (networkKey: string) => void;
  showTestnets?: boolean;
  className?: string;
}

export function NetworkSelector({ 
  onNetworkSelected, 
  showTestnets = true,
  className = "" 
}: NetworkSelectorProps) {
  const { 
    isConnected, 
    network, 
    chainId, 
    connect, 
    switchNetwork, 
    addNetwork,
    error 
  } = useMultiWallet();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);

  const filteredNetworks = Object.entries(SUPPORTED_NETWORKS).filter(
    ([_, config]) => showTestnets || !isTestnet(config.chainId)
  );

  const handleNetworkSelect = async (networkKey: string) => {
    setSelectedNetwork(networkKey);
    setIsConnecting(true);

    try {
      if (!isConnected) {
        await connect(networkKey);
      } else {
        await switchNetwork(networkKey);
      }
      onNetworkSelected?.(networkKey);
    } catch (error) {
      console.error("Error selecting network:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAddNetwork = async (networkKey: string) => {
    try {
      await addNetwork(networkKey);
    } catch (error) {
      console.error("Error adding network:", error);
    }
  };

  const getCurrentNetworkKey = () => {
    if (!chainId) return null;
    return Object.entries(SUPPORTED_NETWORKS).find(
      ([_, config]) => config.chainId === chainId
    )?.[0] || null;
  };

  const currentNetworkKey = getCurrentNetworkKey();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Select Network
          {isConnected && currentNetworkKey && (
            <Badge variant="secondary" className="ml-2">
              Connected to {SUPPORTED_NETWORKS[currentNetworkKey]?.chainName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredNetworks.map(([networkKey, config]) => {
            const isCurrentNetwork = currentNetworkKey === networkKey;
            const isTestnetNetwork = isTestnet(config.chainId);
            
            return (
              <div
                key={networkKey}
                className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                  isCurrentNetwork
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => handleNetworkSelect(networkKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {config.iconUrl && (
                      <img
                        src={config.iconUrl}
                        alt={config.chainName}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <h3 className="font-medium text-sm">
                        {config.chainName}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {config.nativeCurrency.symbol}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isTestnetNetwork && (
                      <Badge variant="outline" className="text-xs">
                        Testnet
                      </Badge>
                    )}
                    {isCurrentNetwork && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>

                {isCurrentNetwork && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <ExternalLink className="w-3 h-3" />
                    <a
                      href={`${config.blockExplorer}/address/${chainId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      View on Explorer
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!isConnected && (
          <div className="pt-4 border-t">
            <Button
              onClick={() => connect()}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
            </Button>
          </div>
        )}

        {isConnected && (
          <div className="pt-4 border-t text-center">
            <p className="text-sm text-gray-600">
              Connected to: <strong>{network}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Chain ID: {chainId}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
