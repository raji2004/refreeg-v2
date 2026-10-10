import { Metadata } from "next";
import CommunityContent from "./components/CommunityContent";

export const metadata: Metadata = {
  title: "Community | RefreeG",
  description:
    "Join the RefreeG community to get funded faster. Connect with donors, share your cause, and grow your support network.",
  openGraph: {
    title: "RefreeG Community | Get Funded Faster",
    description:
      "Your community is your biggest asset. Join thousands of changemakers, donors, and supporters helping each other succeed.",
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
  return <CommunityContent />;
}
