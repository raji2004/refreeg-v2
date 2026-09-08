import { Montserrat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./providers";
import { ClientLayout } from "@/components/client-layout";
import { Metadata } from "next";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://refreeg.com"),
  title: {
    default: "RefreeG | Secure Crowdfunding & Petitions",
    template: "%s | RefreeG",
  },
  description:
    "RefreeG is a secure, blockchain-powered crowdfunding and petition platform.",
  keywords: [
    "crowdfunding",
    "petitions",
    "blockchain",
    "social impact",
    "charity",
  ],
  authors: [{ name: "RefreeG Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://refreeg.com",
    siteName: "RefreeG",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RefreeG",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RefreeG | Secure Crowdfunding & Petitions",
    description:
      "Empowering social change through secure crowdfunding and global petitions.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions (Grammarly, etc.) inject
          data-gr-* attributes onto <body> before React hydrates — a false
          positive, not an actual server/client mismatch. */}
      <body
        className={`${montserrat.variable} font-montserrat antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <ClientLayout>{children}</ClientLayout>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
