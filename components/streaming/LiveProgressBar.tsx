"use client";

import { useState, useEffect, useRef } from "react";
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
  
  // Refs to avoid stale closures and prevent overlapping calls
  const inFlightRef = useRef(false);
  const currentRaisedRef = useRef(initialRaised);
  const initialRaisedRef = useRef(initialRaised);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update refs when state changes
  currentRaisedRef.current = currentRaised;
  initialRaisedRef.current = initialRaised;

  useEffect(() => {
    const updateProgress = async () => {
      // Prevent overlapping calls
      if (inFlightRef.current) return;
      
      inFlightRef.current = true;
      try {
        const status = await getLiveStreamingStatus(causeId);
        if (status) {
          const newRaised = initialRaisedRef.current + status.total_streamed_amount;
          if (newRaised !== currentRaisedRef.current) {
            setIsUpdating(true);
            setCurrentRaised(newRaised);
            
            // Clear existing timeout
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            // Set new timeout
            timeoutRef.current = setTimeout(() => setIsUpdating(false), 1000);
          }
        }
      } catch (error) {
        console.error("Error updating progress:", error);
      } finally {
        inFlightRef.current = false;
      }
    };

    // Update every 2 seconds
    intervalRef.current = setInterval(updateProgress, 2000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [causeId, initialRaised]); // Removed currentRaised from dependencies

  // Safe percentage calculation with proper validation
  const percentRaised = (() => {
    if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(currentRaised)) {
      return 0;
    }
    return Math.min(Math.round((currentRaised / goal) * 100), 100);
  })();

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
