"use client";

import { ArrowRight } from "lucide-react";
import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function LifeMatters() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.3 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 40 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" as any },
    },
  };

  const imageAnim = {
    hidden: { opacity: 0, scale: 0.9 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: 1, ease: "easeOut" as any },
    },
  };

  return (
    <motion.div
      className="w-full h-auto flex flex-col lg:flex-row justify-center items-center px-6 lg:px-10 py-10 gap-4"
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      {}
      <motion.div
        className="w-full lg:w-3/4 h-auto flex flex-col justify-center items-start gap-6"
        variants={item}
      >
        <motion.p
          className="text-xs p-2 border rounded-full bg-[#FAFAFA]"
          variants={item}
        >
          Powered by vetted, audited smart contracts. Withdraw anytime. Your
          funds remain yours — always.
        </motion.p>

        <motion.div
          className="text-left w-full text-2xl md:text-3xl lg:text-5xl font-bold"
          variants={item}
        >
          Your Story Deserves to{" "}
          <span className="text-gray-500">
            Be <br /> Heard
          </span>
        </motion.div>

        <Link href="/cause/create">
          <motion.p className="text-lg text-gray-600" variants={item}>
            Don’t wait. Start your cause today and turn support into real
            impact.
          </motion.p>
        </Link>

        <motion.div variants={item}>
          <Button className="bg-[#FAFAFA] hover:bg-[#8C1823] hover:text-white border text-black px-10 py-4 flex items-center gap-2 rounded-full">
            Get Started
            <ArrowRight size={16} />
          </Button>
        </motion.div>
      </motion.div>

      {}
      <motion.div
        className="w-full lg:w-1/4 h-auto flex justify-center items-center"
        variants={imageAnim}
      >
        <Image
          src="/images/coinsearch.png"
          alt="Grow Your Business"
          width={500}
          height={300}
          className="w-full h-auto hidden md:block"
        />
      </motion.div>
    </motion.div>
  );
}
