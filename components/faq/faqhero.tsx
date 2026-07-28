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

export default function FAQHero() {
  return (
    <motion.section 
      className="w-full px-4 md:px-8 lg:px-16 py-16 md:py-20"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-16 max-w-7xl mx-auto">
        {/* Left: Text Content */}
        <motion.div variants={itemVariants}>
          {/* Top Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-100 text-gray-700 text-sm mb-6">
            Powered by vetted, audited smart contracts. Withdraw anytime. Your funds remain yours — always.
          </div>
          
          {/* Main Heading */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
            RefreeG is More than Just
            <br />
            <span className="text-gray-500">a Crowdfunding Website</span>
          </h1>
          
          {/* Subtext */}
          <p className="text-base md:text-lg text-slate-600 mb-8 max-w-lg">
            Don&apos;t wait. Start your cause today and turn support into real impact.
          </p>
          
          {/* CTA Button */}
          <motion.button 
            className="inline-flex items-center gap-3 rounded-full bg-white text-slate-900 px-6 py-3 text-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Get started 
            <ArrowRightIcon className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* Right: Illustration */}
        <motion.div 
          className="relative flex justify-center lg:justify-end"
          variants={itemVariants}
        >
          <div className="relative w-full max-w-[500px] aspect-[1.2/1]">
            <Image
              src="/images/magnifyer.png"
              alt="Impact and growth illustration"
              fill
              priority={true}
              sizes="(max-width: 1024px) 100vw, 500px"
              className="object-contain drop-shadow-[0_20px_50px_rgba(16,24,40,0.15)]"
            />
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}