import { Bookmark } from "lucide-react";
import { ComingSoonPage } from "@/components/app-shell/coming-soon-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Saved",
  description: "Campaigns and petitions you've saved to revisit later.",
};

export default function SavedPage() {
  return (
    <ComingSoonPage
      title="Saved"
      description="Campaigns and petitions you've saved to revisit later."
      icon={Bookmark}
      emptyStateDescription="Your saved campaigns and petitions will show up here. Look for the bookmark icon on any card in Discover."
    />
  );
}
