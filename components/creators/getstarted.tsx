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

export default function GetStarted() {
  const features = [
    {
      title: "Share Your Link",
      desc: "Promote your unique tag and URL across social media, WhatsApp, and email. Supporters can easily find and donate to you.",
      image: "/images/id.png",
    },
    {
      title: "Engage & Update",
      desc: "Keep your community in the loop. Share progress, post updates, and respond to comments to grow lasting support.",
      image: "/images/fidget-spinner.png",
    },
    {
      title: "Claim Your Tag",
      desc: "Choose a unique tag (like @HopeBuilder) and secure your personal URL. This becomes your identity on RefreeG.",
      image: "/images/tag.png",
    },
  ];

  return (
    <div className="w-full h-auto px-6 md:px-0 mt-16">
      {}
      <motion.div
        className="text-center w-full text-2xl md:text-3xl lg:text-5xl font-bold mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        Getting Started <span className="text-gray-500">Is Easy</span>
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
        {features.map((item, index) => (
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

            {}
            <Button
              className="mt-auto hover:underline left-0 px-0 py-3 outline-none border-0"
              variant="primary"
            >
              Get Started
              <Image
                src="/images/chevronRight2.svg"
                height={16}
                width={16}
                alt="get started"
                className="ml-2"
              />
            </Button>
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
      </motion.div>
    </div>
  );
}
