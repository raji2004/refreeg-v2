"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { faqs } from "@/lib/dummyData";
import FAQItem from "./components/FaqItems";
import { useAnimateInView } from "@/hooks/use-animate-In-view";

export default function FAQ() {
  const [showAll, setShowAll] = useState(false);
  const [openItems, setOpenItems] = useState<string[]>([]);

  const { ref: headingRef, isInView: headingInView } = useAnimateInView({
    once: true,
    margin: "-50px",
  });

  const displayedFaqs = showAll ? faqs : faqs.slice(0, 5);

  const toggleItem = (value: string) => {
    setOpenItems((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    );
  };

  return (
    <div className="container px-6 py-16">
      {/* Heading */}
      <motion.div
        ref={headingRef}
        initial={{ opacity: 0, y: 20 }}
        animate={headingInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <h1 className="text-2xl md:text-4xl font-bold mb-2">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-600 text-lg">
          Got questions? We&apos;ve got the answers you need to get started.
        </p>
      </motion.div>

      <Accordion type="multiple" className="flex flex-col gap-4">
        {displayedFaqs.map((faq, index) => (
          <FAQItem
            key={index}
            faq={faq}
            index={index}
            isOpen={openItems.includes(`item-${index}`)}
            toggleItem={toggleItem}
          />
        ))}
      </Accordion>

      {faqs.length > 5 && (
        <div className="text-center mt-6">
          {!showAll ? (
            <Button
              onClick={() => setShowAll(true)}
              className="text-white"
              variant="secondary"
            >
              View More
            </Button>
          ) : (
            <Button
              onClick={() => setShowAll(false)}
              className="text-white"
              variant="secondary"
            >
              Show Less
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
