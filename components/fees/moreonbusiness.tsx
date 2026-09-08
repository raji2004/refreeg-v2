"use client";
import React from "react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import Image from "next/image";

// Animation variants for reuse
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: "easeOut" as any } 
  },
};

export default function MoreOnBusiness() {
  return (
    <motion.div
      className="w-full h-auto text-white flex flex-col justify-center items-start px-6 lg:px-20 py-10 gap-6 border container bg-[#003E25] rounded-3xl"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      <motion.div 
        className="text-xl"
        variants={itemVariants}
      >
        Built on Trust, Sustained by You
      </motion.div>
      <motion.div 
        className="text-base md:text-2xl lg:text-5xl font-semibold leading-relaxed"
        variants={itemVariants}
      >
        We only succeed when you do. Our transparent fees fuel the platform&apos;s growth and maintain the integrity of your campaigns. Every transaction, every payout — visible, verifiable, and fair.
      </motion.div>
      <motion.div variants={itemVariants}>
        <Button className="bg-[#FAFAFA] border text-black px-10 py-4 flex items-center gap-2 rounded-full">
          Get started today
          <Image src="/images/arrow-right.png" height={20} width={20} alt="get started" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
