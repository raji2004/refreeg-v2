import { Trophy } from "lucide-react";
import { ComingSoonPage } from "@/components/app-shell/coming-soon-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bounties",
  description: "Earn rewards for driving impact on RefreeG.",
};

export default function BountiesPage() {
  return (
    <ComingSoonPage
      title="Bounties"
      description="Earn rewards for driving impact on RefreeG."
      icon={Trophy}
      emptyStateDescription="We're building a way to reward you for the impact you drive on RefreeG. Check back soon."
    />
  );
}
