import Link from "next/link";
import { Wallet } from "lucide-react";
import { ComingSoonPage } from "@/components/app-shell/coming-soon-page";
import { Button } from "@/components/ui/button";
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
      action={
        <Button asChild variant="ink" className="rounded-xl">
          <Link href="/dashboard/settings/bank">Manage payout details</Link>
        </Button>
      }
    />
  );
}
