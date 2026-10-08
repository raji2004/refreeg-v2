"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.2, ease: "easeOut" as any },
  }),
};

type Item = {
  icon: string;
  text: string;
};

const defaultItems: Item[] = [
  {
    icon: "/money.svg",
    text: "$1M+ raised across causes within the first months of launch.",
  },
  {
    icon: "/forms.png",
    text: "72% faster to receive donations compared to traditional relief fundraising.",
  },
  {
    icon: "/users.png",
    text: "Global reach in 40+ countries. Donations flow across borders in minutes.",
  },
];

export default function ImpactHighlights({
  items = defaultItems,
}: {
  items?: Item[];
}) {
  return (
    <section className="w-full px-4 md:px-8 lg:px-16 my-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            className="flex items-start gap-4 p-5 md:p-6 rounded-xl bg-white shadow-sm border border-gray-100"
            custom={idx}
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            viewport={{ once: true }}
          >
            <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
              <Image src={item.icon} alt="impact icon" width={28} height={28} />
            </div>
            <p className="text-base md:text-lg font-medium text-gray-900 leading-relaxed">
              {item.text}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
