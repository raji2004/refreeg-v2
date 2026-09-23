"use client";
import React from "react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";

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
    transition: { duration: 0.6, ease: "easeOut" as any },
  },
};

export default function JoinOurCommunity() {
  return (
    <motion.div
      className="w-full bg-[#1F6B47] text-white py-16 px-6 md:px-10 lg:px-20 container rounded-3xl"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="max-w-4xl mx-auto text-center">
        {}
        <motion.h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6"
          variants={itemVariants}
        >
          Ready to be part of the solution?
        </motion.h2>

        {}
        <motion.p
          className="text-sm md:text-base lg:text-lg leading-relaxed mb-8 max-w-3xl mx-auto"
          variants={itemVariants}
        >
          Join the RefreeG community and become a RefreeGerian today! By joining
          us, you contribute to empowering less privileged individuals in
          communities, supporting causes that foster socio-economic growth, and
          promoting sustainable development. Together, we can make a significant
          impact and create a brighter future for all.
        </motion.p>

        {}
        <motion.div variants={itemVariants}>
          <Button className="bg-white text-[#1F6B47] hover:bg-gray-50 px-8 py-4 text-base font-semibold rounded-lg shadow-lg transition-colors duration-200 hover:scale-105 active:scale-95">
            Join our community
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
