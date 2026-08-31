import { useState, useMemo } from "react";
import { calculateServiceFee, calculateProviderFee } from "@/lib/utils";

export function useCampaignDonation(initialAmount = 0) {
  const [donation, setDonation] = useState(initialAmount);
  const [tip, setTip] = useState(10);
  const [recurring, setRecurring] = useState<"one_time" | "weekly" | "monthly">(
    "one_time",
  );

  const serviceFee = useMemo(() => calculateServiceFee(donation), [donation]);
  const providerFee = useMemo(
    () => (donation > 0 ? calculateProviderFee(donation, "paystack") : 0),
    [donation],
  );
  const totalWithTip = useMemo(
    () => donation + tip + serviceFee + providerFee,
    [donation, tip, serviceFee, providerFee],
  );

  return {
    donation,
    setDonation,
    tip,
    setTip,
    recurring,
    setRecurring,
    serviceFee,
    providerFee,
    totalWithTip,
  };
}
