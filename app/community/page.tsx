import { Metadata } from "next";
import { FaTelegramPlane } from "react-icons/fa";

import Accountability from "@/components/home/Accountability";
import { AnnouncementMarquee } from "@/components/ui/announcement-marquee";

import { CommunityHero } from "./_components/CommunityHero";
import { CommunityPerks } from "./_components/CommunityPerks";
import { CommunitySteps } from "./_components/CommunitySteps";
import { COMMUNITY_LINK } from "./_data/community";

export const metadata: Metadata = {
  title: "Community",
  description:
    "Join the RefreeG community to get funded faster. Connect with donors, share your cause, and grow your support network.",
  openGraph: {
    title: "RefreeG Community | Get Funded Faster",
    description:
      "Your community is your biggest asset. Join changemakers, donors, and supporters helping each other succeed.",
    url: "https://www.refreeg.com/community",
    siteName: "RefreeG",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RefreeG Community",
      },
    ],
  },
};

export default function CommunityPage() {
  return (
    <div className="flex flex-col bg-surface">
      <CommunityHero />

      <AnnouncementMarquee />

      <CommunitySteps />

      <CommunityPerks />

      <div className="mx-4 sm:mx-8">
        <Accountability
          title={
            <>
              Don&apos;t fundraise
              <br />
              <span className="text-brand-blue">alone.</span>
            </>
          }
          description="Whether it's your first cause or your fifth, the RefreeG community is ready to share, support and fund it."
          actions={
            <a
              href={COMMUNITY_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-blue px-5 py-3 text-sm font-medium text-brand-blue-foreground transition-colors hover:bg-brand-blue/90"
            >
              <FaTelegramPlane className="h-4 w-4" aria-hidden="true" />
              Join now, it&apos;s free
            </a>
          }
        />
      </div>
    </div>
  );
}
