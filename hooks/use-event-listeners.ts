"use client";

import { useEffect, useRef, useCallback } from "react";

export interface EventPayload {
  type: "comment" | "share" | "donation" | "weekly_streak" | "monthly_active";
  data: Record<string, any>;
  timestamp: string;
}

type EventCallback = (payload: EventPayload) => void;

interface ListenerOptions {
  userId?: string;
  onComment?: EventCallback;
  onShare?: EventCallback;
  onDonation?: EventCallback;
  onWeeklyStreak?: EventCallback;
  onMonthlyActive?: EventCallback;
}

export function useEventListeners(options: ListenerOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);

  const setupListeners = useCallback(() => {
    // Prevent multiple connections
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = new URL("/api/events", window.location.origin);
    if (options.userId) {
      url.searchParams.append("userId", options.userId);
    }

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        // Ignore ping events
        if (payload.type === 'ping') return;

        switch (payload.type) {
          case "comment":
            options.onComment?.(payload);
            break;
          case "share":
            options.onShare?.(payload);
            break;
          case "donation":
            options.onDonation?.(payload);
            break;
          case "weekly_streak":
            options.onWeeklyStreak?.(payload);
            break;
          case "monthly_active":
            options.onMonthlyActive?.(payload);
            break;
        }
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Connection Error:", error);
      // EventSource auto-reconnects, but we can log it here
    };
  }, [
    options.userId,
    options.onComment,
    options.onShare,
    options.onDonation,
    options.onWeeklyStreak,
    options.onMonthlyActive,
  ]);

  useEffect(() => {
    setupListeners();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [setupListeners]);
}
