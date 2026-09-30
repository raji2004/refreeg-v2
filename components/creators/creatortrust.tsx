"use client";

import Image from "next/image";
import React from "react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as any },
  },
};

export default function CreatorTrust() {
  const features = [
    {
      title: "Unique Identity",
      desc: "Claim your personal tag (like @JaneCares) and your own URL. Supporters can easily find, follow, and donate directly to you.",
      image: "/images/id.png",
    },
    {
      title: " Transparent Donations",
      desc: "Every contribution is visible and traceable, so donors know exactly where their money is going — building trust from day one.",
      image: "/images/holdcash.png",
    },
    {
      title: "Grow Your Support",
      desc: "Share your tag and URL across social media, WhatsApp, or email. The easier you share, the faster your community grows.",
      image: "/images/clickphone.png",
    },
    {
      title: "Direct Connection",
      desc: "Let people comment, follow your updates, and engage directly with your journey — turning donors into long-term supporters.",
      image: "/images/chainlock.png",
    },
    {
      title: "Multi-Currency Support",
      desc: "Receive donations in multiple fiat currencies and crypto. No matter where your supporters are, giving to your cause is fast, easy, and borderless.",
      image: "/images/walletcoin.png",
    },
  ];

  return (
    <div className="w-full h-auto px-6 md:px-0 mt-16">
      {}
      <motion.div
        className="text-center w-full text-2xl md:text-3xl lg:text-5xl font-bold mb-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        Everything You Need to Be Seen, <br /> Trusted, and Supported
      </motion.div>
      <motion.div
        className="text-center w-full text-base md:text-lg lg:text-base mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        RefreeG gives you more than just a fundraising page — it gives you a
        unique identity, transparent tools, and a direct line to <br /> your
        supporters. With your tag and URL, you’ll be easy to find, easier to
        trust, and unstoppable in growing your community.
      </motion.div>

      {}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        {}
        {features.slice(0, 3).map((item, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="flex flex-col items-start gap-4 p-6 rounded-2xl border shadow-sm bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300"
          >
            <motion.div
              whileHover={{ rotate: 10 }}
              transition={{ type: "spring" }}
            >
              <Image src={item.image} width={60} height={60} alt={item.title} />
            </motion.div>
            <p className="font-semibold text-lg">{item.title}</p>
            <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}

        {}
        {features.slice(3, 5).map((item, index) => (
          <motion.div
            key={index + 3}
            variants={itemVariants}
            className="flex flex-col items-start gap-4 p-6 rounded-2xl border shadow-sm bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300"
          >
            <motion.div
              whileHover={{ rotate: 10 }}
              transition={{ type: "spring" }}
            >
              <Image src={item.image} width={60} height={60} alt={item.title} />
            </motion.div>
            <p className="font-semibold text-lg">{item.title}</p>
            <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}

        {}
        <motion.div
          variants={itemVariants}
          className="flex justify-center items-center p-6"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button className="w-full bg-secondary hover:bg-blue-500 border px-6 py-6 flex items-center justify-center gap-2 rounded-full shadow">
              <Image
                src="/images/plasticpricetag.png"
                height={20}
                width={20}
                alt="get started"
              />
              Claim your tag today
              <Image
                src="/images/arrow-right-1.png"
                height={20}
                width={20}
                alt="get started"
              />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
