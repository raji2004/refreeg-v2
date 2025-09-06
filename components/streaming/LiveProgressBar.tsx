"use client";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { getLiveStreamingStatus } from "@/actions/streaming-donation-actions";

interface LiveProgressBarProps {
  causeId: string;
  initialRaised: number;
  goal: number;
}

export function LiveProgressBar({ causeId, initialRaised, goal }: LiveProgressBarProps) {
  const [currentRaised, setCurrentRaised] = useState(initialRaised);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const updateProgress = async () => {
      try {
        const status = await getLiveStreamingStatus(causeId);
        if (status) {
          const newRaised = initialRaised + status.total_streamed_amount;
          if (newRaised !== currentRaised) {
            setIsUpdating(true);
            setCurrentRaised(newRaised);
            setTimeout(() => setIsUpdating(false), 1000);
          }
        }
      } catch (error) {
        console.error("Error updating progress:", error);
      }
    };

    // Update every 2 seconds
    const interval = setInterval(updateProgress, 2000);
    return () => clearInterval(interval);
  }, [causeId, initialRaised, currentRaised]);

  const percentRaised = Math.min(Math.round((currentRaised / goal) * 100), 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">
          ₦{currentRaised.toLocaleString()}
          {isUpdating && <span className="text-green-600 ml-1">↗️</span>}
        </span>
        <span className="text-muted-foreground">
          of ₦{goal.toLocaleString()}
        </span>
      </div>
      <Progress 
        value={percentRaised} 
        className={`h-3 transition-all duration-1000 ${isUpdating ? 'bg-green-100' : ''}`}
      />
      <div className="text-sm text-muted-foreground text-right">
        {percentRaised}% raised
        {isUpdating && <span className="text-green-600 ml-1">(Live)</span>}
      </div>
    </div>
  );
}
