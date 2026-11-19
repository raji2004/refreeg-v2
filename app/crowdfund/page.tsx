import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Metadata } from "next";

import Accountability from "@/components/home/Accountability";
import { ContractsBand } from "@/components/home/ContractsBand";
import { AnnouncementMarquee } from "@/components/ui/announcement-marquee";

import { CrowdfundHero } from "./_components/CrowdfundHero";
import { UseCaseNav } from "./_components/UseCaseNav";
import { UseCaseSection } from "./_components/UseCaseSection";
import { crowdfundUseCases } from "@/lib/options/crowdfund.options";

export const metadata: Metadata = {
  title: "What can I crowdfund?",
  description:
    "Crowdfund for healthcare, disaster relief, nonprofits, businesses and creators on Refreeg, with milestone releases and proof donors can check.",
};

export default function CrowdfundPage() {
  return (
    <div className="flex flex-col bg-surface">
      <CrowdfundHero />
      <UseCaseNav />

      {crowdfundUseCases.map((useCase, index) => (
        <UseCaseSection key={useCase.id} useCase={useCase} index={index} />
      ))}

      <ContractsBand />
      <AnnouncementMarquee />

      <div className="mx-4 sm:mx-8">
        <Accountability
          title={
            <>
              Start your
              <br />
              cause <em className="italic">today.</em>
            </>
          }
          description="Not sure where yours fits? Start anyway. It's free to set up."
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
