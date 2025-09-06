"use client";

import { MultiNetworkDonationButton } from "./MultiNetworkDonationButton";

interface MultiNetworkDonationWrapperProps {
  causeId: string;
}

export function MultiNetworkDonationWrapper({ causeId }: MultiNetworkDonationWrapperProps) {
  const handleDonationSuccess = (amount: number) => {
    // Refresh the page to show updated donation amount
    window.location.reload();
  };

  return (
    <MultiNetworkDonationButton 
      causeId={causeId}
      onDonationSuccess={handleDonationSuccess}
    />
  );
}
