import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Metadata } from "next";

import Accountability from "@/components/home/Accountability";
import { ContractsBand } from "@/components/home/ContractsBand";
import { AnnouncementMarquee } from "@/components/ui/announcement-marquee";

import { FaqExplorer } from "./_components/FaqExplorer";
import { faqCategories } from "./_data/faqs";

export const metadata: Metadata = {
  title: "FAQ - Refreeg Help Centre",
  description:
    "Answers to common questions about giving, milestone releases, receipts, fees and starting a cause on RefreeG.",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqCategories.flatMap((category) =>
    category.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  ),
};

export default function FaqPage() {
  return (
    <div className="flex flex-col bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <FaqExplorer marquee={<AnnouncementMarquee />} />

      <ContractsBand />

      <div className="mx-4 sm:mx-8">
        <Accountability
          title={
            <>
              Start your
              <br />
              cause <span className="text-brand-blue">today.</span>
            </>
          }
          description="Turn support into real impact. It's free to start."
          actions={
            <Link
              href="/dashboard/causes/create"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-blue px-5 py-3 text-sm font-medium text-brand-blue-foreground transition-colors hover:bg-brand-blue/90"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
      </div>
    </div>
  );
}
