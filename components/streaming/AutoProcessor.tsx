"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, RefreshCw } from "lucide-react";

interface AutoProcessorProps {
  onProcessed?: (count: number) => void;
}

export function AutoProcessor({ onProcessed }: AutoProcessorProps) {
  const [isRunning, setIsRunning] = useState(true); // Start by default
  const [lastProcessed, setLastProcessed] = useState<number>(0);
  const [lastProcessTime, setLastProcessTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processStreams = async () => {
    try {
      setError(null);
      
      // Process regular streaming donations
      const response = await fetch('/api/streaming/auto-process');
      const data = await response.json();
      
      // Process crypto streaming donations
      const cryptoResponse = await fetch('/api/crypto-streaming/process');
      const cryptoData = await cryptoResponse.json();
      
      const totalProcessed = (data.processedCount || 0) + (cryptoData.processed_count || 0);
      
      if (data.success || cryptoData.success) {
        setLastProcessed(totalProcessed);
        setLastProcessTime(new Date());
        onProcessed?.(totalProcessed);
        console.log(`Processed ${totalProcessed} streaming donations (${data.processedCount || 0} regular + ${cryptoData.processed_count || 0} crypto)`);
      } else {
        setError(data.error || cryptoData.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      console.error('Error processing streams:', err);
    }
  };

  const startAutoProcessing = () => {
    setIsRunning(true);
    setError(null);
    
    // Process immediately
    processStreams();
    
    // Then process every 1 second for more responsive streaming
    const interval = setInterval(processStreams, 1000);
    
    // Store interval ID for cleanup
    (window as any).streamingAutoProcessor = interval;
  };

  // Start auto-processing on mount
  useEffect(() => {
    startAutoProcessing();
    
    // Cleanup on unmount
    return () => {
      stopAutoProcessing();
    };
  }, []);

  const stopAutoProcessing = () => {
    setIsRunning(false);
    if ((window as any).streamingAutoProcessor) {
      clearInterval((window as any).streamingAutoProcessor);
      (window as any).streamingAutoProcessor = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoProcessing();
    };
  }, []);

  // Hide the UI since it runs automatically
  return null;
}
