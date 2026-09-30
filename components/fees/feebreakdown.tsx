"use client";

import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
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

type FeeItem = {
  title: string;
  value: string;
  desc: string;
  image: string;
};

export default function FeeBreakdown() {
  const items: FeeItem[] = [
    {
      title: "Platform Fee",
      value: "3%",
      desc: "Supports platform maintenance, fraud prevention & customer support",
      image: "/images/laptopscreen.png",
    },
    {
      title: "Blockchain Gas Fee",
      value: "Dynamic",
      desc: "Applied to crypto donations only",
      image: "/images/creditcards.png",
    },
    {
      title: "Withdrawal Fee",
      value: "No fee",
      desc: "There are no withdrawal fees, you get your donations after they’ve been processed immediately in the account you provide",
      image: "/images/documentwithcheckmark.png",
    },
  ];

  return (
    <div className="w-full h-auto px-6 md:px-0 mt-16">
      {}
      <motion.div
        className="text-center w-full mb-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold">
          Fee Breakdown
        </h2>
        <p className="mt-4 max-w-3xl mx-auto text-sm md:text-base text-muted-foreground">
          RefreeG only takes a small percentage to keep the platform secure,
          transparent, and accessible for everyone. Most of your funds go
          directly to the causes and creators you support.
        </p>
      </motion.div>

      {}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        {items.map((item, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="flex flex-col items-start gap-4 p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm bg-white hover:shadow-md hover:-translate-y-1 transition-all duration-300"
          >
            <motion.div
              whileHover={{ rotate: 10 }}
              transition={{ type: "spring" }}
            >
              <Image
                src={item.image}
                width={120}
                height={120}
                alt={item.title}
              />
            </motion.div>
            <div className="flex items-center justify-between w-full">
              <p className="font-semibold text-lg md:text-xl">{item.title}</p>
              <span className="text-gray-500 font-semibold text-base md:text-lg">
                {item.value}
              </span>
            </div>
            <p className="text-gray-600 text-sm md:text-base leading-relaxed">
              {item.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
