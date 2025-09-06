"use client";

import { useState, useEffect } from "react";
import { EnhancedCausesList } from "@/components/causes/EnhancedCausesList";
import { KYCVerificationBadge } from "@/components/kyc/KYCVerificationBadge";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Heart } from "lucide-react";

// Mock causes data for demo
const mockCauses = [
  {
    id: "1",
    title: "Clean Water Initiative",
    description: "Providing clean water to communities in rural areas through sustainable infrastructure projects.",
    category: "environment",
    goal: 20000,
    raised: 12500,
    image: "/placeholder.svg?height=200&width=400",
    days_active: 45,
    status: "approved",
    user: {
      full_name: "John Doe",
      sub_account_code: "ACCT_001"
    }
  },
  {
    id: "2",
    title: "Education for All",
    description: "Supporting education for underprivileged children by providing school supplies and scholarships.",
    category: "education",
    goal: 15000,
    raised: 8700,
    image: "/placeholder.svg?height=200&width=400",
    days_active: 30,
    status: "approved",
    user: {
      full_name: "Jane Smith",
      sub_account_code: "ACCT_002"
    }
  },
  {
    id: "3",
    title: "Medical Supplies Drive",
    description: "Collecting medical supplies for local clinics to improve healthcare access in underserved communities.",
    category: "health",
    goal: 25000,
    raised: 18200,
    image: "/placeholder.svg?height=200&width=400",
    days_active: 60,
    status: "approved",
    user: {
      full_name: "Dr. Michael Johnson",
      sub_account_code: "ACCT_003"
    }
  },
  {
    id: "4",
    title: "Animal Shelter Support",
    description: "Supporting local animal shelters with food, medical care, and adoption programs.",
    category: "animals",
    goal: 12000,
    raised: 7500,
    image: "/placeholder.svg?height=200&width=400",
    days_active: 25,
    status: "approved",
    user: {
      full_name: "Sarah Wilson",
      sub_account_code: "ACCT_004"
    }
  },
  {
    id: "5",
    title: "Disaster Relief Fund",
    description: "Emergency relief fund for communities affected by natural disasters and emergencies.",
    category: "disaster",
    goal: 50000,
    raised: 32000,
    image: "/placeholder.svg?height=200&width=400",
    days_active: 15,
    status: "approved",
    user: {
      full_name: "Emergency Response Team",
      sub_account_code: "ACCT_005"
    }
  },
  {
    id: "6",
    title: "Community Garden Project",
    description: "Creating sustainable community gardens to promote healthy eating and environmental awareness.",
    category: "community",
    goal: 8000,
    raised: 4200,
    image: "/placeholder.svg?height=200&width=400",
    days_active: 20,
    status: "approved",
    user: {
      full_name: "Green Thumb Collective",
      sub_account_code: "ACCT_006"
    }
  }
];

export default function EnhancedCausesDemoPage() {
  const { user, isLoading } = useAuth();
  const [showFeatures, setShowFeatures] = useState(false);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Enhanced Causes List Demo</h1>
        <p className="text-gray-600 mb-4">
          Experience the new multi-network crypto donation features with KYC verification.
        </p>
        
        <Button 
          onClick={() => setShowFeatures(!showFeatures)}
          variant="outline"
          className="mb-6"
        >
          {showFeatures ? "Hide" : "Show"} Features
        </Button>

        {showFeatures && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-blue-500" />
                  KYC Verification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Required for crypto donations and advanced features
                </p>
                {user ? (
                  <KYCVerificationBadge userId={user.id} showFullCard />
                ) : (
                  <p className="text-sm text-gray-500">Please sign in to view status</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="w-5 h-5 text-purple-500" />
                  Multi-Network Crypto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Support for multiple blockchain networks
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Ethereum:</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Polygon:</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BSC:</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Arbitrum:</span>
                    <span className="text-green-600">✓</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="w-5 h-5 text-red-500" />
                  Traditional Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Paystack integration for fiat donations
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Bank Transfer:</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Card Payment:</span>
                    <span className="text-green-600">✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mobile Money:</span>
                    <span className="text-green-600">✓</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* User Status */}
      {user && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Your Account Status</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-700">
              Signed in as: <strong>{user.email}</strong>
            </span>
            <KYCVerificationBadge userId={user.id} />
          </div>
        </div>
      )}

      {/* Enhanced Causes List */}
      <EnhancedCausesList
        causes={mockCauses}
        currentPage={1}
        totalPages={1}
      />

      {/* Instructions */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">How to Test</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>1. <strong>Sign in</strong> to see your KYC verification status</p>
          <p>2. <strong>Click "Donate Now"</strong> on any cause card</p>
          <p>3. <strong>Choose between Crypto or Traditional</strong> payment methods</p>
          <p>4. <strong>For crypto donations:</strong> Connect your wallet and select a network</p>
          <p>5. <strong>For traditional donations:</strong> Use the Paystack form</p>
        </div>
      </div>
    </div>
  );
}
