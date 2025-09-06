"use client";

import { useRouter } from "next/navigation";
import MaticDonationButton from "./Matic[Redacted]/MaticDonationButton";

interface MaticDonationButtonWrapperProps {
  causeId: string;
}

export default function MaticDonationButtonWrapper({
  causeId,
}: MaticDonationButtonWrapperProps) {
  const router = useRouter();

  const handleDonationSuccess = (amountInNaira: number) => {
    // Refresh the page to update the progress bar and donor count
    router.refresh();
  };

  return (
    <MaticDonationButton
      causeId={causeId}
      onDonationSuccess={handleDonationSuccess}
    />
  );
}
