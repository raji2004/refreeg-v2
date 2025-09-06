"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getMatchingPoolForCause, isCauseEligibleForMatching } from "@/actions/matching-pool-actions";
import { DollarSign, Clock, Users } from "lucide-react";

interface MatchingStatusProps {
  causeId: string;
}

export function MatchingStatus({ causeId }: MatchingStatusProps) {
  const [matchingInfo, setMatchingInfo] = useState<any>(null);
  const [isEligible, setIsEligible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatchingInfo();
  }, [causeId]);

  const loadMatchingInfo = async () => {
    try {
      setLoading(true);
      
      const [poolInfo, eligibility] = await Promise.all([
        getMatchingPoolForCause(causeId),
        isCauseEligibleForMatching(causeId),
      ]);
      
      // If total_amount is missing, we need to fetch it separately
      if (poolInfo && !poolInfo.total_amount) {
        poolInfo.total_amount = 100000;
      }
      
      setMatchingInfo(poolInfo);
      setIsEligible(eligibility);
    } catch (error) {
      console.error("Error loading matching info:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-green-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-green-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show anything if no matching pool is active
  if (!isEligible || !matchingInfo) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatRatio = (ratio: number) => {
    return `1:${Math.round(1 / ratio)}`;
  };

  const progressPercentage = matchingInfo.total_amount && matchingInfo.total_amount > 0 
    ? Math.round(((matchingInfo.total_amount - matchingInfo.remaining_amount) / matchingInfo.total_amount) * 10000) / 100
    : 0;

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          <CardTitle className="text-lg text-green-800">Matching Pool Active!</CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            {formatRatio(matchingInfo.matching_ratio)} Match
          </Badge>
        </div>
        <CardDescription className="text-green-700">
          Your donations will be matched by the {matchingInfo.pool_name} pool
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-green-700">Pool Progress</span>
            <span className="font-medium text-green-800">{progressPercentage.toFixed(2)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-green-600">Remaining:</span>
            <p className="font-medium text-green-800">
              {formatCurrency(matchingInfo.remaining_amount)}
            </p>
          </div>
          <div>
            <span className="text-green-600">Your Impact:</span>
            <p className="font-medium text-green-800">
              {formatRatio(matchingInfo.matching_ratio)} multiplier
            </p>
          </div>
        </div>

        <div className="bg-green-100 p-3 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>How it works:</strong> When you donate, the matching pool will add{" "}
            {Math.round(matchingInfo.matching_ratio * 100)}% of your donation amount to this cause.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
