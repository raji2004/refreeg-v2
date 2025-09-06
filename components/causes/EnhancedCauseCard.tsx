"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KYCVerificationBadge } from "@/components/kyc/KYCVerificationBadge";
import { MultiNetworkDonationButton } from "@/components/crypto-details/MultiNetworkDonationButton";
import { DonationForm } from "@/components/donation-form";
import { useAuth } from "@/hooks/use-auth";
import { Heart, Share2, ExternalLink, Shield, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface EnhancedCauseCardProps {
  cause: {
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
  };
  profile?: {
    id: string;
    name: string;
    email: string;
  };
}

export function EnhancedCauseCard({ cause, profile }: EnhancedCauseCardProps) {
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [activeTab, setActiveTab] = useState("crypto");
  const { user } = useAuth();

  const percentRaised = Math.min(Math.round((cause.raised / cause.goal) * 100), 100);
  const isDisabled = cause.status === "pending" || cause.status === "rejected";

  const handleDonationSuccess = (amount: number) => {
    // Refresh the page or update the cause data
    window.location.reload();
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors">
              {cause.title}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {cause.description}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0">
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
            <Image
              src={cause.image}
              alt={cause.title}
              width={400}
              height={200}
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
          <Progress value={percentRaised} className="h-2" />
          <div className="text-right text-sm text-gray-500">
            {percentRaised}% funded
          </div>
        </div>

        {/* KYC Verification Status */}
        {user && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Your Status:</span>
            <KYCVerificationBadge userId={user.id} />
          </div>
        )}

        {/* Donation Form */}
        {showDonationForm && (
          <div className="border-t pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="crypto" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Crypto
                </TabsTrigger>
                <TabsTrigger value="traditional" className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Traditional
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="crypto" className="mt-4">
                {user ? (
                  <MultiNetworkDonationButton
                    causeId={cause.id}
                    onDonationSuccess={handleDonationSuccess}
                  />
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Please sign in to make crypto donations
                    </p>
                    <Button asChild>
                      <Link href="/auth">Sign In</Link>
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="traditional" className="mt-4">
                {profile ? (
                  <DonationForm
                    causeId={cause.id}
                    profile={profile}
                    status={cause.status as "pending" | "rejected" | "approved"}
                    subaccount={cause.user.sub_account_code}
                  />
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Please sign in to make donations
                    </p>
                    <Button asChild>
                      <Link href="/auth">Sign In</Link>
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4">
        <div className="flex gap-2 w-full">
          <Button
            onClick={() => setShowDonationForm(!showDonationForm)}
            disabled={isDisabled}
            className="flex-1"
          >
            {showDonationForm ? "Hide Donation" : "Donate Now"}
          </Button>
          
          <Button variant="outline" size="icon" asChild>
            <Link href={`/causes/${cause.id}`}>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </Button>
          
          <Button variant="outline" size="icon">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
