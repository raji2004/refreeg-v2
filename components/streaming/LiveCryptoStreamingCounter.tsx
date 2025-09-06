"use client";

import { useState, useEffect } from "react";
import { getLiveCryptoStreamingStatus } from "@/actions/crypto-streaming-actions";

interface LiveCryptoStreamingCounterProps {
  causeId: string;
}

export function LiveCryptoStreamingCounter({ causeId }: LiveCryptoStreamingCounterProps) {
  const [currentAmount, setCurrentAmount] = useState(0);
  const [targetAmount, setTargetAmount] = useState(0);
  const [streamRate, setStreamRate] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [cryptoCurrency, setCryptoCurrency] = useState("");
  const [accumulatedNaira, setAccumulatedNaira] = useState(0); // Accumulated Naira changes
  const [lastNairaUpdate, setLastNairaUpdate] = useState<Date | null>(null); // Last time Naira was updated

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatCryptoAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
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
        const status = await getLiveCryptoStreamingStatus(causeId);
        if (status) {
          const newTargetAmount = status.total_crypto_streamed;
          const newStreamRate = status.current_crypto_stream_rate_per_second;
          const newCryptoCurrency = status.crypto_currency || "CRYPTO";
          
          if (newTargetAmount !== targetAmount) {
            // Calculate the Naira equivalent of the crypto change
            const cryptoChange = newTargetAmount - targetAmount;
            const nairaChange = cryptoChange * 302.5; // Conversion rate
            
            // Accumulate the Naira change
            const newAccumulatedNaira = accumulatedNaira + nairaChange;
            
            // Check if 1 hour has passed since last Naira update
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
            const shouldUpdateNaira = !lastNairaUpdate || lastNairaUpdate < oneHourAgo;
            
            // Always update crypto amounts, but only update Naira display every hour
            if (shouldUpdateNaira) {
              setAccumulatedNaira(0); // Reset accumulator
              setLastNairaUpdate(now);
              setTargetAmount(newTargetAmount);
              setStreamRate(newStreamRate);
              setCryptoCurrency(newCryptoCurrency);
              setLastUpdate(now);
              
              // Animate to new amount
              animateToAmount(newTargetAmount);
            } else {
              // Store the accumulated change for next time
              setAccumulatedNaira(newAccumulatedNaira);
              // Still update crypto amounts for rate display
              setStreamRate(newStreamRate);
              setCryptoCurrency(newCryptoCurrency);
            }
          }
        }
      } catch (error) {
        console.error("Error updating crypto streaming status:", error);
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
          {formatCurrency(currentAmount * 302.5)}
        </span>
        {isAnimating && (
          <span className="text-green-400 ml-2 animate-bounce text-3xl">↗️</span>
        )}
      </div>

      {/* Stream Rate - 4 Significant Figures */}
      <div className="text-2xl text-blue-600 font-semibold mb-1">
        +{formatToSignificantFigures(streamRate, 4)} {cryptoCurrency}/sec
      </div>

      {/* Crypto Amount */}
      <div className="text-lg text-purple-600 font-medium">
        💎 {formatToSignificantFigures(currentAmount, 4)} {cryptoCurrency}
      </div>
    </div>
  );
}
