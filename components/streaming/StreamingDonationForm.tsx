"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStreamingDonation } from "@/actions/streaming-donation-actions";
import { toast } from "@/hooks/use-toast";
import { Play, Clock, DollarSign } from "lucide-react";

interface StreamingDonationFormProps {
  causeId: string;
  onDonationSuccess?: () => void;
}

export function StreamingDonationForm({ causeId, onDonationSuccess }: StreamingDonationFormProps) {
  const [formData, setFormData] = useState({
    donorName: "",
    donorEmail: "",
    totalAmount: "",
    streamDuration: "7", // days
    streamInterval: "1", // seconds
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.donorName || !formData.donorEmail || !formData.totalAmount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      console.log("Creating streaming donation with data:", {
        causeId,
        donorName: formData.donorName,
        donorEmail: formData.donorEmail,
        totalAmount: parseFloat(formData.totalAmount),
        streamDurationDays: parseInt(formData.streamDuration),
        streamIntervalSeconds: parseInt(formData.streamInterval),
      });
      
      const result = await createStreamingDonation({
        causeId,
        donorName: formData.donorName,
        donorEmail: formData.donorEmail,
        totalAmount: parseFloat(formData.totalAmount),
        streamDurationDays: parseInt(formData.streamDuration),
        streamIntervalSeconds: parseInt(formData.streamInterval),
      });

      console.log("Streaming donation result:", result);

      if (result.success) {
        toast({
          title: "Success",
          description: "Streaming donation started! Watch the live progress below.",
        });
        
        // Reset form
        setFormData({
          donorName: "",
          donorEmail: "",
          totalAmount: "",
          streamDuration: "7",
          streamInterval: "1",
        });
        
        onDonationSuccess?.();
      } else {
        toast({
          title: "Error",
          description: "Failed to create streaming donation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating streaming donation:", error);
      toast({
        title: "Error",
        description: `Failed to create streaming donation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreamRate = () => {
    if (!formData.totalAmount || !formData.streamDuration) return 0;
    
    const totalAmount = parseFloat(formData.totalAmount);
    const durationDays = parseInt(formData.streamDuration);
    const durationSeconds = durationDays * 24 * 60 * 60;
    
    return totalAmount / durationSeconds;
  };

  const streamRate = calculateStreamRate();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5 text-blue-600" />
          Start Streaming Donation
        </CardTitle>
        <CardDescription>
          Your donation will flow continuously to this cause over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="donorName">Your Name *</Label>
              <Input
                id="donorName"
                value={formData.donorName}
                onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="donorEmail">Email Address *</Label>
              <Input
                id="donorEmail"
                type="email"
                value={formData.donorEmail}
                onChange={(e) => setFormData({ ...formData, donorEmail: e.target.value })}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Donation Amount (NGN) *</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              placeholder="10000"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="streamDuration">Stream Duration</Label>
              <Select
                value={formData.streamDuration}
                onValueChange={(value) => setFormData({ ...formData, streamDuration: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">1 Week</SelectItem>
                  <SelectItem value="14">2 Weeks</SelectItem>
                  <SelectItem value="30">1 Month</SelectItem>
                  <SelectItem value="90">3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="streamInterval">Stream Interval</Label>
              <Select
                value={formData.streamInterval}
                onValueChange={(value) => setFormData({ ...formData, streamInterval: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every Second</SelectItem>
                  <SelectItem value="5">Every 5 Seconds</SelectItem>
                  <SelectItem value="10">Every 10 Seconds</SelectItem>
                  <SelectItem value="60">Every Minute</SelectItem>
                  <SelectItem value="300">Every 5 Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {streamRate > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Streaming Preview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Rate per second:</span>
                  <p className="font-medium text-blue-900">₦{streamRate.toFixed(8)}</p>
                </div>
                <div>
                  <span className="text-blue-700">Rate per minute:</span>
                  <p className="font-medium text-blue-900">₦{(streamRate * 60).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-blue-700">Rate per hour:</span>
                  <p className="font-medium text-blue-900">₦{(streamRate * 3600).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-blue-700">Rate per day:</span>
                  <p className="font-medium text-blue-900">₦{(streamRate * 86400).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Starting Stream...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Streaming Donation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
