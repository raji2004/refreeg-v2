"use client";

import React from "react";
import { motion, Variants } from "framer-motion";

const HowItWorksSection = () => {
  const steps = [
    {
      number: "1",
      title: "Create Your Campaign",
      description: "Set up your nonprofit profile and cause in minutes.",
      tip: "Get tips for creating and scaling your campaign",
    },
    {
      number: "2",
      title: "Get Verified",
      description: "Our fraud-compliance checks ensure donor trust.",
      tip: "Get tips for creating and scaling transparent campaigns.",
    },
    {
      number: "3",
      title: "Raise Globally",
      description: "Accept donations from anywhere in multiple currencies.",
      tip: "Get tips for setting up your wallets and bank accounts",
    },
    {
      number: "4",
      title: "Report & Update",
      description: "Share real-time impact stories with your community.",
      tip: "Get tips on how to provide updates and motivate your community",
    },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  const numberVariants: Variants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.6, type: "spring" as const, stiffness: 200 },
    },
    pulse: {
      scale: [1, 1.05],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        repeatType: "reverse" as const,
      },
    },
  };

  return (
    <section className="relative bg-white py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-50px" }}
        >
          <motion.h2
            className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            How It Works
          </motion.h2>

          <motion.p
            className="text-2xl text-gray-600 font-medium mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
          >
            Simple, Secure, Impactful.
          </motion.p>

          <motion.div
            className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto rounded-full"
            initial={{ width: 0 }}
            whileInView={{ width: 96 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          />
        </motion.div>

        {}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="group"
              variants={itemVariants}
            >
              <div className="flex gap-6">
                {}
                <motion.div
                  className="flex-shrink-0 relative"
                  variants={numberVariants}
                  animate="pulse"
                >
                  <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <motion.span
                      className="text-2xl font-bold text-white"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1 + 0.3,
                        type: "spring",
                        stiffness: 200,
                      }}
                      viewport={{ once: true }}
                    >
                      {step.number}
                    </motion.span>
                  </div>
                </motion.div>

                {}
                <div className="flex-1">
                  <motion.h3
                    className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors duration-300"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 + 0.3 }}
                    viewport={{ once: true }}
                  >
                    {step.title}
                  </motion.h3>

                  <motion.p
                    className="text-gray-600 text-lg mb-3 leading-relaxed"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 + 0.4 }}
                    viewport={{ once: true }}
                  >
                    {step.description}
                  </motion.p>

                  {}
                  <motion.p
                    className="text-purple-500 text-sm font-medium flex items-center gap-2 cursor-pointer"
                    whileHover={{ x: 5, color: "#7c3aed" }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <motion.svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      whileHover={{
                        y: [0, -3, 0],
                        transition: { duration: 0.6 },
                      }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
                        clipRule="evenodd"
                      />
                    </motion.svg>
                    {step.tip}
                  </motion.p>
                </div>
              </div>

              {}
              {index < steps.length - 2 && (
                <motion.div
                  className="ml-8 mt-4 mb-4 relative"
                  initial={{ opacity: 0, height: 0 }}
                  whileInView={{ opacity: 1, height: 40 }}
                  transition={{ duration: 0.6, delay: index * 0.1 + 0.6 }}
                  viewport={{ once: true }}
                >
                  <div className="absolute left-0 top-0 w-0.5 h-full bg-gradient-to-b from-purple-300 to-blue-300"></div>
                  <div className="absolute left-0 top-0 w-2 h-2 bg-purple-500 rounded-full -ml-1"></div>
                  <div className="absolute left-0 bottom-0 w-2 h-2 bg-blue-500 rounded-full -ml-1"></div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>

      {}
      <div className="absolute top-20 left-10 w-32 h-32 bg-purple-100 rounded-full opacity-50 blur-xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-blue-100 rounded-full opacity-50 blur-xl"></div>
    </section>
  );
};

export default HowItWorksSection;
