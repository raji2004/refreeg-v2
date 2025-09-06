"use client";

import { useState, useEffect } from "react";
import { getLiveStreamingStatus } from "@/actions/streaming-donation-actions";

interface LiveStreamingCounterProps {
  causeId: string;
}

export function LiveStreamingCounter({ causeId }: LiveStreamingCounterProps) {
  const [currentAmount, setCurrentAmount] = useState(0);
  const [targetAmount, setTargetAmount] = useState(0);
  const [streamRate, setStreamRate] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [accumulatedAmount, setAccumulatedAmount] = useState(0); // Accumulated amount changes
  const [lastAmountUpdate, setLastAmountUpdate] = useState<Date | null>(null); // Last time amount was updated

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatRate = (rate: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate);
  };

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const status = await getLiveStreamingStatus(causeId);
        if (status) {
          const newTargetAmount = status.total_streamed_amount;
          const newStreamRate = status.current_stream_rate_per_second;
          
          if (newTargetAmount !== targetAmount) {
            // Calculate the amount change
            const amountChange = newTargetAmount - targetAmount;
            
            // Accumulate the change
            const newAccumulatedAmount = accumulatedAmount + amountChange;
            
            // Check if 1 hour has passed since last amount update
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
            const shouldUpdateAmount = !lastAmountUpdate || lastAmountUpdate < oneHourAgo;
            
            // Only update amount display every hour
            if (shouldUpdateAmount) {
              setAccumulatedAmount(0); // Reset accumulator
              setLastAmountUpdate(now);
              setTargetAmount(newTargetAmount);
              setStreamRate(newStreamRate);
              setLastUpdate(now);
              
              // Animate to new amount
              animateToAmount(newTargetAmount);
            } else {
              // Store the accumulated change for next time
              setAccumulatedAmount(newAccumulatedAmount);
              // Still update stream rate for display
              setStreamRate(newStreamRate);
            }
          }
        }
      } catch (error) {
        console.error("Error updating streaming status:", error);
      }
    };

    // Update every 1 second for more responsive UI
    const interval = setInterval(updateStatus, 1000);
    updateStatus(); // Initial load

    return () => clearInterval(interval);
  }, [causeId, targetAmount]);

  const animateToAmount = (target: number) => {
    setIsAnimating(true);
    const startAmount = currentAmount;
    const difference = target - startAmount;
    const duration = 1000; // 1 second animation
    const steps = 30; // 30 steps
    const stepDuration = duration / steps;
    const stepAmount = difference / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const newAmount = startAmount + (stepAmount * step);
      setCurrentAmount(newAmount);

      if (step >= steps) {
        setCurrentAmount(target);
        clearInterval(timer);
        setIsAnimating(false);
      }
    }, stepDuration);
  };

  const formatToSignificantFigures = (num: number, figures: number = 4) => {
    if (num === 0) return "0";
    
    // For very small numbers, show decimal places with zeros until we reach significant digits
    if (Math.abs(num) < 0.0001) {
      const magnitude = Math.floor(Math.log10(Math.abs(num)));
      const decimalPlaces = Math.abs(magnitude) + figures - 1;
      return num.toFixed(decimalPlaces);
    }
    
    // For larger numbers, use regular significant figures
    const magnitude = Math.floor(Math.log10(Math.abs(num)));
    const factor = Math.pow(10, figures - 1 - magnitude);
    return (Math.round(num * factor) / factor).toString();
  };

  return (
    <div className="text-center">
      {/* Main Amount with Counting Animation - Flashing Digits */}
      <div className="text-5xl font-bold text-green-600 mb-2">
        <span className={`${isAnimating ? "animate-pulse" : ""} ${isAnimating ? "text-green-500" : "text-green-600"}`}>
          {formatCurrency(currentAmount)}
        </span>
        {isAnimating && (
          <span className="text-green-400 ml-2 animate-bounce text-3xl">↗️</span>
        )}
      </div>

      {/* Stream Rate - 4 Significant Figures */}
      <div className="text-2xl text-blue-600 font-semibold mb-1">
        +{formatToSignificantFigures(streamRate)}/sec
      </div>

      {/* Per Minute Rate */}
      <div className="text-lg text-blue-600 font-medium">
        💸 {formatCurrency(streamRate * 60)}/min
      </div>
    </div>
  );
}
