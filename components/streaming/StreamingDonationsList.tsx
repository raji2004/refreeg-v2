"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getStreamingDonationsForCause, pauseStreamingDonation, resumeStreamingDonation, cancelStreamingDonation } from "@/actions/streaming-donation-actions";
import { toast } from "@/hooks/use-toast";
import { Play, Pause, Square, Clock, DollarSign, User } from "lucide-react";

interface StreamingDonationsListProps {
  causeId: string;
}

export function StreamingDonationsList({ causeId }: StreamingDonationsListProps) {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDonations();
    
    // Refresh every 5 seconds to show live updates
    const interval = setInterval(loadDonations, 5000);
    
    return () => clearInterval(interval);
  }, [causeId]);

  const loadDonations = async () => {
    try {
      const data = await getStreamingDonationsForCause(causeId);
      setDonations(data);
    } catch (error) {
      console.error("Error loading streaming donations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (donationId: string) => {
    try {
      const result = await pauseStreamingDonation(donationId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Streaming donation paused",
        });
        loadDonations();
      }
    } catch (error) {
      console.error("Error pausing donation:", error);
      toast({
        title: "Error",
        description: "Failed to pause streaming donation",
        variant: "destructive",
      });
    }
  };

  const handleResume = async (donationId: string) => {
    try {
      const result = await resumeStreamingDonation(donationId);
      if (result.success) {
        toast({
          title: "Success",
          description: "Streaming donation resumed",
        });
        loadDonations();
      }
    } catch (error) {
      console.error("Error resuming donation:", error);
      toast({
        title: "Error",
        description: "Failed to resume streaming donation",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (donationId: string) => {
    if (!confirm("Are you sure you want to cancel this streaming donation? The remaining amount will be refunded.")) {
      return;
    }

    try {
      const result = await cancelStreamingDonation(donationId);
      if (result.success) {
        toast({
          title: "Success",
          description: `Streaming donation cancelled. Refund: ₦${result.refundAmount.toFixed(2)}`,
        });
        loadDonations();
      }
    } catch (error) {
      console.error("Error cancelling donation:", error);
      toast({
        title: "Error",
        description: "Failed to cancel streaming donation",
        variant: "destructive",
      });
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

  const getStatusBadge = (donation: any) => {
    if (!donation.is_active) {
      return <Badge variant="secondary">Completed</Badge>;
    } else if (donation.is_paused) {
      return <Badge variant="outline" className="text-yellow-600">Paused</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-600">Streaming</Badge>;
    }
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

  if (donations.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-gray-500">
          <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No streaming donations yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Active Streaming Donations
        </CardTitle>
        <CardDescription>
          Real-time streaming donations for this cause
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {donations.map((donation) => {
          const progressPercentage = (donation.streamed_amount / donation.total_amount) * 100;
          const timeRemaining = donation.remaining_amount / donation.stream_rate_per_second;
          const hoursRemaining = timeRemaining / 3600;
          const daysRemaining = hoursRemaining / 24;

          return (
            <div key={donation.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{donation.donor_name}</span>
                  {getStatusBadge(donation)}
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(donation.total_amount)}</p>
                  <p className="text-sm text-gray-500">Total Amount</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Streaming Progress</span>
                  <span className="font-medium">{progressPercentage.toFixed(2)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Streamed: {formatCurrency(donation.streamed_amount)}</span>
                  <span>Remaining: {formatCurrency(donation.remaining_amount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Rate:</span>
                  <p className="font-medium">{formatRate(donation.stream_rate_per_second)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Time Remaining:</span>
                  <p className="font-medium">
                    {daysRemaining > 1 
                      ? `${daysRemaining.toFixed(1)} days`
                      : `${hoursRemaining.toFixed(1)} hours`
                    }
                  </p>
                </div>
              </div>

              {donation.is_active && (
                <div className="flex gap-2">
                  {donation.is_paused ? (
                    <Button
                      size="sm"
                      onClick={() => handleResume(donation.id)}
                      className="flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePause(donation.id)}
                      className="flex items-center gap-1"
                    >
                      <Pause className="h-3 w-3" />
                      Pause
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleCancel(donation.id)}
                    className="flex items-center gap-1"
                  >
                    <Square className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
