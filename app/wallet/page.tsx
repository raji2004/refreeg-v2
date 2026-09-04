import { Wallet } from "lucide-react";
import { ComingSoonPage } from "@/components/app-shell/coming-soon-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet",
  description: "Your points, balances, and payout details in one place.",
};

export default function WalletPage() {
  return (
    <ComingSoonPage
      title="Wallet"
      description="Your points, balances, and payout details in one place."
      icon={Wallet}
      emptyStateDescription="Wallet is on its way. In the meantime, manage your payout details from Settings."
    />
  );
}
