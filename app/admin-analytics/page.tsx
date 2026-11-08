import { StandaloneAnalytics } from "@/components/admin/standalone-analytics";

export const metadata = {
  title: "Admin analytics · UI preview",
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return <StandaloneAnalytics />;
}
