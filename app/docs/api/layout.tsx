import { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Reference & Developer Documentation",
  description:
    "Official RefreeG API documentation. Integrate secure crowdfunding, manage campaigns, and automate donations with our robust REST API and SDKs for Node.js and Python.",
  keywords: [
    "RefreeG API",
    "crowdfunding API",
    "donation integration",
    "developer documentation",
    "fundraising SDK",
    "Node.js SDK",
    "Python SDK",
    "webhooks",
    "automated settlement",
  ],
  openGraph: {
    title: "RefreeG API | Developer Documentation",
    description:
      "Launch campaigns and manage donations programmatically with RefreeG.",
    url: "https://refreeg.com/docs/api",
    type: "article",
    images: ["/og-api-docs.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "RefreeG Developer API",
    description:
      "Build the future of social impact with our developer-friendly API.",
  },
};

export default function ApiDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
