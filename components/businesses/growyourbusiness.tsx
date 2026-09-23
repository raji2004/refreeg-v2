"use client";

import { ArrowRight } from "lucide-react";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function GrowYourBusiness() {
  return (
    <div className="w-full h-auto flex flex-col lg:flex-row justify-center items-center px-6 lg:px-10 py-10 gap-4 overflow-hidden">
      {}
      <motion.div
        className="w-full lg:w-3/4 h-auto flex flex-col justify-center items-start gap-6"
        initial={{ opacity: 0, x: -80 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        viewport={{ once: true }}
      >
        <p className="text-xs p-2 border rounded-full bg-[#FAFAFA]">
          Powered by vetted, audited smart contracts. Withdraw anytime. Your
          funds remain yours — always.
        </p>
        <h1 className="text-4xl lg:text-5xl font-bold text-black leading-tight">
          Ready to Grow Your Business?
        </h1>
        <p className="text-lg text-gray-600">
          Join thousands of entrepreneurs using RefreeG to bring their vision to
          life.
        </p>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            href="../dashboard/causes/create"
            className="bg-[#FAFAFA] border text-black px-10 py-4 flex items-center gap-2 rounded-full"
          >
            Get Started
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </motion.div>

      {}
      <motion.div
        className="w-full lg:w-1/4 h-auto flex justify-center items-center"
        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{
          duration: 0.8,
          ease: [0.43, 0.13, 0.23, 0.96],
          delay: 0.2,
        }}
        viewport={{ once: true }}
      >
        <Image
          src="/dartcoin.png"
          alt="Grow Your Business"
          width={500}
          height={300}
          className="w-full h-auto hidden md:block"
        />
      </motion.div>
    </div>
  );
}
