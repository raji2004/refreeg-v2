"use client";

import React from "react";
import { FaArrowRight } from "react-icons/fa6";
import { motion } from "framer-motion";
import Image from "next/image";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.2, ease: "easeOut" as any },
  }),
};

export default function Hero() {
  return (
    <div className="relative w-full min-h-[50vh] flex items-center justify-center px-6 md:px-10 py-16 bg-white">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          className="mb-8 flex justify-center"
          custom={0}
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <Image
            width={126.17}
            height={91.67}
            src="/images/hero-icon.png"
            alt="hero-icon"
          />
        </motion.div>

        <motion.h1
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6"
          custom={1}
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          We are Refreeg
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-10 leading-relaxed"
          custom={2}
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          Built by people who believe funding should be simple, fair, and
          accessible to everyone. We believe that trust is the foundation of
          every relationship, and it deserves to be rewarded.
        </motion.p>

        <motion.a
          href="/dashboard/causes/create"
          className="inline-flex items-center gap-x-3 text-white px-8 py-4 bg-[#0B5CB8] hover:bg-[#0A53A6] rounded-lg shadow-lg text-lg font-medium transition-colors duration-200"
          custom={3}
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.95 }}
        >
          Start a Cause Now <FaArrowRight className="text-sm" />
        </motion.a>
      </div>
    </div>
  );
}
