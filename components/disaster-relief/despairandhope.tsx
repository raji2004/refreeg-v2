"use client";

import { ArrowRight } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";

export default function DespairAndHope() {
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: "easeOut" as any,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as any },
    },
  };

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={containerVariants}
      className="w-full h-auto flex flex-col lg:flex-row justify-center items-center px-6 lg:px-10 py-10 pb-12 gap-4 overflow-hidden"
    >
      {}
      <motion.div
        variants={containerVariants}
        className="w-full lg:w-3/4 h-auto flex flex-col justify-center items-start gap-6"
      >
        <motion.p
          variants={itemVariants}
          className="text-xs p-2 border rounded-full bg-[#FAFAFA]"
        >
          Powered by vetted, audited smart contracts. Withdraw anytime. Your
          funds remain yours — always.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="text-left w-full text-2xl md:text-3xl lg:text-5xl font-bold"
        >
          Be the Difference Between <br />
          <span className="text-gray-500">Despair and Hope </span>
        </motion.div>

        <motion.p variants={itemVariants} className="text-lg text-gray-600">
          Join RefreeG and make disaster relief faster, safer, and more
          impactful. Survivors are <br /> waiting.
        </motion.p>

        <motion.div variants={itemVariants} whileHover={{ scale: 1.05 }}>
          <Link href="/dashboard/causes/create">
            <Button className="bg-[#FAFAFA] hover:bg-[#0A0A0B] hover:text-white border text-black px-10 py-4 flex items-center gap-2 rounded-full transition-all duration-300">
              Get Started
              <ArrowRight size={16} />
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {}
      <motion.div
        variants={itemVariants}
        transition={{ delay: 0.3 }}
        className="w-full lg:w-1/4 h-auto flex justify-center items-center"
      >
        <Image
          src="/images/coinsearch.png"
          alt="Grow Your Business"
          width={600}
          height={400}
          className="w-full h-auto hidden md:block"
        />
      </motion.div>
    </motion.div>
  );
}
