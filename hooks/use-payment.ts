"use client";
import { useState, useEffect, useCallback } from "react";
import { TransactionData } from "@/types";
import { toast } from "@/components/ui/use-toast";

interface UsePaymentReturn {
  initializePayment: (data: TransactionData) => Promise<void>;
  initializePledgeCheckout: (input: {
    pledgeId: string;
    guestToken?: string | null;
  }) => Promise<void>;
  verifyPayment: (reference: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export const usePayment = (): UsePaymentReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializePayment = useCallback(async (data: TransactionData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to initialize payment");
      }

      localStorage.setItem("payment_reference", result.data.reference);

      window.location.href = result.data.authorization_url;
    } catch (error) {
      console.error("Payment initialization failed:", error);
      setError("Failed to initialize payment. Please try again.");
      toast({
        title: "Failed to initialize payment. Please try again.",
        description: "Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initializePledgeCheckout = useCallback(
    async (input: { pledgeId: string; guestToken?: string | null }) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/payments/pledge/initialize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pledgeId: input.pledgeId,
            ...(input.guestToken ? { guestToken: input.guestToken } : {}),
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to initialize pledge payment");
        }

        localStorage.setItem("payment_reference", result.data.reference);

        window.location.href = result.data.authorization_url;
      } catch (error) {
        console.error("Pledge checkout initialization failed:", error);
        setError("Failed to open Paystack. Please try again.");
        toast({
          title: "Could not start payment",
          description: "Please try again.",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const verifyPayment = useCallback(
    async (reference: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/payments/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to verify payment");
        }

        if (result.verified) {
          localStorage.removeItem("payment_reference");
          return true;
        } else {
          setError("Payment verification failed");
          return false;
        }
      } catch (error) {
        console.error("Payment verification failed:", error);
        setError("Failed to verify payment");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    initializePayment,
    initializePledgeCheckout,
    verifyPayment,
    isLoading,
    error,
  };
};
