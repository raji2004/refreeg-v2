import React from "react";
import FAQHero from "@/components/faq/faqhero";
import FAQSection from "@/components/faq/faqsection";
import GotQuestions from "@/components/faq/gotquestions";

export default function Faq() {
  return (
    <div className="flex flex-col gap-6 md:gap-10 lg:gap-16">
      {" "}
      {}
      <GotQuestions />
      <FAQSection />
      <FAQHero />
    </div>
  );
}
