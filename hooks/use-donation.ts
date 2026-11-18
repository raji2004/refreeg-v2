"use client";

import { useState } from "react";
import { createDonation } from "@/actions/donations/donation-actions";
import type { DonationFormData } from "@/types";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function useDonation() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const createUserDonation = async (
    causeId: string,
    userId: string | null,
    donationData: DonationFormData,
  ) => {
    setIsLoading(true);

    try {
      await createDonation(causeId, userId, donationData);

      toast({
        title: "Thank you for your donation!",
        description: "Your contribution will make a difference.",
      });

      router.refresh();
      return true;
    } catch (error: any) {
      toast({
        title: "Error processing donation",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createDonation: createUserDonation,
  };
}
