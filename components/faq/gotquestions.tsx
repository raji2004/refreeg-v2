"use client";

import { motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
// Animation variants for reuse
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
    transition: { duration: 0.6, ease: "easeOut" as any } 
  },
};

export default function GotQuestions() {
  return (
    <motion.section 
      className="w-full px-4 md:px-8 lg:px-16 py-16 md:py-20"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 items-center gap-8">
          {/* Left Image */}
          <motion.div 
            className="flex justify-center lg:justify-start"
            variants={itemVariants}
          >
            <Image src="/coinscale.png" alt="coinscale" width={200} height={200} />
          </motion.div>

          {/* Center Content */}
          <motion.div 
            className="text-center"
            variants={itemVariants}
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Got Questions? You&apos;re at
              <br />
              the right place
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-8">
              Find the answers to your question
            </p>
            
            {/* CTA Button */}
            <motion.button 
              className="inline-flex items-center gap-3 rounded-lg bg-blue-600 text-white px-6 py-3 text-base font-medium shadow-sm hover:bg-blue-700 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Start a Cause Now 
              <ArrowRightIcon className="w-4 h-4" />
            </motion.button>
          </motion.div>

          {/* Right Image */}
          <motion.div 
            className="flex justify-center lg:justify-end"
            variants={itemVariants}
          >
           <Image src="/filecase.png" alt="filecase" width={200} height={200} />
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}