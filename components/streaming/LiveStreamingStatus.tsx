"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getLiveStreamingStatus } from "@/actions/streaming-donation-actions";
import { LiveStreamingCounter } from "./LiveStreamingCounter";
import { DollarSign, Activity, Clock, TrendingUp } from "lucide-react";

interface LiveStreamingStatusProps {
  causeId: string;
}

export function LiveStreamingStatus({ causeId }: LiveStreamingStatusProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadStatus();
    
    // Update every second for real-time effect
    const interval = setInterval(loadStatus, 1000);
    
    return () => clearInterval(interval);
  }, [causeId]);

  const loadStatus = async () => {
    try {
      const data = await getLiveStreamingStatus(causeId);
      setStatus(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading streaming status:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatRate = (rate: number) => {
    if (rate < 0.01) {
      return `₦${rate.toFixed(8)}/sec`;
    } else if (rate < 1) {
      return `₦${rate.toFixed(4)}/sec`;
    } else {
      return `₦${rate.toFixed(2)}/sec`;
    }
  };

  if (loading) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-blue-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status || status.active_streams_count === 0) {
    return null;
  }

  const progressPercentage = status.total_streaming_amount > 0 
    ? (status.total_streamed_amount / status.total_streaming_amount) * 100
    : 0;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
          <CardTitle className="text-lg text-blue-800">Live Streaming Active!</CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {status.active_streams_count} Stream{status.active_streams_count !== 1 ? 's' : ''}
          </Badge>
        </div>
        <CardDescription className="text-blue-700">
          Money is flowing to this cause in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">Streaming Progress</span>
            <span className="font-medium text-blue-800">
              {progressPercentage.toFixed(2)}%
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-3 bg-blue-100" 
          />
          <div className="flex justify-between text-xs text-blue-600">
            <span>Streamed: {formatCurrency(status.total_streamed_amount)}</span>
            <span>Total: {formatCurrency(status.total_streaming_amount)}</span>
          </div>
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-blue-100 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-blue-600 font-medium">Current Rate</span>
            </div>
            <p className="font-bold text-blue-800 text-lg">
              {formatRate(status.current_stream_rate_per_second)}
            </p>
          </div>
          <div className="bg-blue-100 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-blue-600 font-medium">Active Streams</span>
            </div>
            <p className="font-bold text-blue-800 text-lg">
              {status.active_streams_count}
            </p>
          </div>
        </div>

        {/* Live Counter Animation - Rising Wallet Balance */}
        <LiveStreamingCounter causeId={causeId} />

        {lastUpdate && (
          <p className="text-xs text-blue-500 text-center">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
