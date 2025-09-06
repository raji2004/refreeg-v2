"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { KYCVerificationBadge } from "@/components/kyc/KYCVerificationBadge";
import { Shield, Wallet, ExternalLink, CheckCircle } from "lucide-react";
import Link from "next/link";

interface Cause {
  id: string;
  title: string;
  description: string;
  category: string;
  goal: number;
  raised: number;
  image?: string | null;
  days_active?: number | null;
  status: string;
  user: {
    full_name: string;
    sub_account_code?: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  crypto_wallets?: {
    solana?: string;
    ethereum?: string;
    polygon?: string;
    bsc?: string;
    arbitrum?: string;
    optimism?: string;
  };
}

export default function CryptoCausesDemoPage() {
  const { user } = useAuth();
  const [causes, setCauses] = useState<Cause[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      try {
        // Fetch causes created by the user with crypto wallets
        const { data: causesData, error: causesError } = await supabase
          .from("causes")
          .select(`
            id,
            title,
            description,
            category,
            goal,
            raised,
            image,
            days_active,
            status,
            user_id,
            created_at
          `)
          .eq("user_id", "74dd6b0c-416c-42c5-a37c-e066952dd272")
          .eq("status", "approved")
          .order("created_at", { ascending: false });

        console.log("Causes data:", causesData);
        console.log("Causes error:", causesError);
        
        if (causesError) throw causesError;

        // Fetch user profiles for these causes
        const userIds = [...new Set(causesData?.map(c => c.user_id) || [])];
        console.log("User IDs:", userIds);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, crypto_wallets")
          .in("id", userIds);

        console.log("Profiles data:", profilesData);
        console.log("Profiles error:", profilesError);
        
        if (profilesError) throw profilesError;

        // Transform data
        const profilesMap: Record<string, Profile> = {};
        profilesData?.forEach(profile => {
          profilesMap[profile.id] = profile;
        });

        const transformedCauses = causesData?.map(cause => ({
          ...cause,
          user: {
            full_name: profilesMap[cause.user_id]?.full_name || "Unknown User",
            sub_account_code: profilesMap[cause.user_id]?.sub_account_code
          }
        })) || [];

        setCauses(transformedCauses);
        setProfiles(profilesMap);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getWalletCount = (profile: Profile) => {
    if (!profile.crypto_wallets) return 0;
    return Object.values(profile.crypto_wallets).filter(wallet => wallet && wallet !== '').length;
  };

  const getWalletNetworks = (profile: Profile) => {
    if (!profile.crypto_wallets) return [];
    return Object.entries(profile.crypto_wallets)
      .filter(([_, wallet]) => wallet && wallet !== '')
      .map(([network, _]) => network);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto mb-4" />
          <p>Loading crypto-enabled causes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Crypto-Enabled Causes</h1>
        <p className="text-gray-600 mb-4">
          These causes support multi-network crypto donations. Creators have connected their crypto wallets.
        </p>
        
        {user && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Your Status</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm text-blue-700">
                Signed in as: <strong>{user.email}</strong>
              </span>
              <KYCVerificationBadge userId={user.id} />
            </div>
          </div>
        )}
      </div>

      {causes.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Wallet className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No crypto-enabled causes found</h3>
          <p className="text-gray-500">
            The creator needs to connect their crypto wallets to enable crypto donations.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {causes.map((cause) => {
            const creatorProfile = profiles[cause.user_id];
            const walletCount = getWalletCount(creatorProfile);
            const walletNetworks = getWalletNetworks(creatorProfile);
            const percentRaised = Math.min(Math.round((cause.raised / cause.goal) * 100), 100);

            return (
              <Card key={cause.id} className="group hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {cause.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {cause.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {cause.category}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
                    <span>by {cause.user.full_name}</span>
                    {cause.days_active && (
                      <span>{cause.days_active} days active</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Image */}
                  {cause.image && (
                    <div className="aspect-video w-full overflow-hidden rounded-lg">
                      <img
                        src={cause.image}
                        alt={cause.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">₦{cause.raised.toLocaleString()}</span>
                      <span className="text-gray-500">of ₦{cause.goal.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${percentRaised}%` }}
                      />
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {percentRaised}% funded
                    </div>
                  </div>

                  {/* Crypto Wallet Status */}
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Crypto Donations Enabled
                      </span>
                    </div>
                    <div className="text-xs text-green-700">
                      <p>Creator has {walletCount} wallet(s) connected:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {walletNetworks.map(network => (
                          <Badge key={network} variant="outline" className="text-xs">
                            {network.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>

                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button asChild className="flex-1">
                      <Link href={`/causes/${cause.id}`}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View & Donate
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">How Crypto Donations Work</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>1. <strong>Creator connects wallets:</strong> Cause creators add their crypto wallet addresses</p>
          <p>2. <strong>KYC verification:</strong> Donors need to be KYC verified to make crypto donations</p>
          <p>3. <strong>Multi-network support:</strong> Donate using Ethereum, Polygon, BSC, Arbitrum, or Optimism</p>
          <p>4. <strong>Real-time conversion:</strong> See Naira equivalent in real-time</p>
          <p>5. <strong>Secure transactions:</strong> All transactions are recorded on the blockchain</p>
        </div>
      </div>
    </div>
  );
}
