"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiNetworkDonationButton } from "@/components/crypto-details/MultiNetworkDonationButton";
import { NetworkSelector } from "@/components/crypto-details/NetworkSelector";
import { useMultiWallet } from "@/hooks/use-multi-wallet";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Wallet, Network } from "lucide-react";

export default function MultiWalletDemoPage() {
  const {
    isConnected,
    address,
    chainId,
    network,
    connect,
    disconnect,
    getBalance,
    isMetaMaskInstalled,
  } = useMultiWallet();

  const [balance, setBalance] = useState<string>("0");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const handleGetBalance = async () => {
    if (!address) return;
    
    setIsLoadingBalance(true);
    try {
      const bal = await getBalance();
      setBalance(parseFloat(bal).toFixed(6));
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleDonationSuccess = (amount: number) => {
    console.log("Donation successful:", amount);
    // Refresh balance after donation
    handleGetBalance();
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Multi-Network Wallet Demo</h1>
        <p className="text-gray-600">
          Test the enhanced MetaMask integration with support for multiple networks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Wallet Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">MetaMask Installed:</span>
                <Badge variant={isMetaMaskInstalled ? "default" : "destructive"}>
                  {isMetaMaskInstalled ? "Yes" : "No"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Connected:</span>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Yes" : "No"}
                </Badge>
              </div>

              {isConnected && (
                <>
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Address:</span>
                    <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                      {address}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-sm font-medium">Network:</span>
                    <p className="text-sm">{network}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-sm font-medium">Chain ID:</span>
                    <p className="text-sm font-mono">{chainId}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Balance:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGetBalance}
                        disabled={isLoadingBalance}
                      >
                        {isLoadingBalance ? "Loading..." : "Refresh"}
                      </Button>
                    </div>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                      {balance} {network?.split(' ')[0] || 'ETH'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t">
              {!isConnected ? (
                <Button onClick={() => connect()} className="w-full">
                  Connect Wallet
                </Button>
              ) : (
                <Button onClick={disconnect} variant="outline" className="w-full">
                  Disconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Network Selector Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Network Selector
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NetworkSelector 
              onNetworkSelected={(networkKey) => {
                console.log("Network selected:", networkKey);
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Multi-Network Donation Demo */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Multi-Network Donation Demo</CardTitle>
            <p className="text-sm text-gray-600">
              This is a demo donation form. In a real scenario, this would be connected to an actual cause.
            </p>
          </CardHeader>
          <CardContent>
            <MultiNetworkDonationButton
              causeId="demo-cause-id"
              onDonationSuccess={handleDonationSuccess}
            />
          </CardContent>
        </Card>
      </div>

      {/* Features List */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Features Implemented</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium">Multi-Network Support</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Ethereum Mainnet</li>
                  <li>• Polygon</li>
                  <li>• BSC (Binance Smart Chain)</li>
                  <li>• Arbitrum One</li>
                  <li>• Optimism</li>
                  <li>• Testnets (Sepolia, Polygon Amoy)</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Wallet Features</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Automatic network switching</li>
                  <li>• Network addition to MetaMask</li>
                  <li>• Real-time balance checking</li>
                  <li>• Transaction confirmation</li>
                  <li>• Error handling & user feedback</li>
                  <li>• Block explorer integration</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documentation Links */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Documentation & Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="https://docs.metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm">MetaMask Docs</span>
              </a>
              
              <a
                href="https://ethereum.org/en/developers/docs/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm">Ethereum Docs</span>
              </a>
              
              <a
                href="https://docs.ethers.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm">Ethers.js Docs</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
