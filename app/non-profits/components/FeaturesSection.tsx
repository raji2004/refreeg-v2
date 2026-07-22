"use client";

import React from "react";
import { motion } from "framer-motion";

const FeaturesSection = () => {
  // Animation variants with proper TypeScript types
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  const iconVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.6,
        type: "spring" as const,
        stiffness: 200,
      },
    },
  };

  const textVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
      },
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const,
      },
    },
    hover: {
      scale: 1.05,
      y: -2,
      transition: {
        duration: 0.3,
        ease: "easeInOut" as const,
      },
    },
    tap: {
      scale: 0.95,
    },
  };

  const barChartVariants = {
    hidden: { height: 0 },
    visible: (height: number) => ({
      height: height * 4,
      transition: {
        duration: 0.8,
        ease: "easeOut" as const,
      },
    }),
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-50 py-8 md:py-16 px-4 sm:px-6 lg:px-8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <motion.div className="text-center mb-12 md:mb-20" variants={itemVariants}>
          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            How <span className="text-black">RefreeG</span>{" "}
            <span className="text-gray-400">Helps Nonprofits</span>
          </motion.h1>
          <motion.p
            className="text-base sm:text-lg md:text-xl text-gray-600 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            Transparent fundraising, global payments, and yield
            opportunities—all in one platform for business growth
          </motion.p>
        </motion.div>

        {/* Features Grid - Responsive layout */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-16 mb-12 md:mb-20"
          variants={containerVariants}
        >
          {/* Global Reach */}
          <motion.div
            className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-12 shadow-sm hover:shadow-lg transition-all duration-300"
            variants={itemVariants}
            whileHover={{
              y: -8,
              transition: { duration: 0.3 },
            }}
          >
            <motion.div className="mb-6 md:mb-8" variants={iconVariants}>
              <div className="relative w-16 h-16 md:w-20 md:h-20">
                {/* Gold coins with green arrow */}
                <motion.div
                  className="absolute bottom-0 left-0 w-4 h-6 md:w-6 md:h-8 bg-yellow-400 rounded-sm"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="absolute bottom-0 left-2 md:left-3 w-4 h-8 md:w-6 md:h-10 bg-yellow-500 rounded-sm"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                />
                <motion.div
                  className="absolute bottom-0 left-4 md:left-6 w-4 h-10 md:w-6 md:h-12 bg-yellow-600 rounded-sm"
                  animate={{ y: [0, -7, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                />
                <motion.div
                  className="absolute -top-1 md:-top-2 left-6 md:left-8 w-6 h-6 md:w-8 md:h-8"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-full h-full"
                  >
                    <path
                      d="M7 17L17 7M17 7H7M17 7V17"
                      stroke="#22c55e"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </div>
            </motion.div>
            <motion.h3
              className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 md:mb-4"
              variants={textVariants}
            >
              Global Reach
            </motion.h3>
            <motion.p
              className="text-gray-600 text-sm md:text-base lg:text-lg leading-relaxed"
              variants={textVariants}
              transition={{ delay: 0.1 }}
            >
              Accept donations in multiple fiat and crypto wallets, expanding
              your support base beyond borders.
            </motion.p>
          </motion.div>

          {/* Transparent Fund Tracking */}
          <motion.div
            className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-12 shadow-sm hover:shadow-lg transition-all duration-300"
            variants={itemVariants}
            whileHover={{
              y: -8,
              transition: { duration: 0.3 },
            }}
          >
            <motion.div className="mb-6 md:mb-8" variants={iconVariants}>
              <div className="relative w-16 h-16 md:w-20 md:h-20">
                {/* Globe with magnifying glass */}
                <motion.div
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-teal-500 relative"
                  animate={{ rotate: [0, 5, 0, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-teal-600"></div>
                  <div className="absolute top-2 left-2 md:top-3 md:left-3 w-4 h-4 md:w-6 md:h-6 rounded-full bg-teal-700"></div>
                </motion.div>
                <motion.div
                  className="absolute bottom-0 right-0 w-8 h-8 md:w-10 md:h-10 bg-green-500 rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  <div className="w-4 h-4 md:w-6 md:h-6 rounded-full border-2 border-white"></div>
                </motion.div>
              </div>
            </motion.div>
            <motion.h3
              className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 md:mb-4"
              variants={textVariants}
            >
              Transparent Fund Tracking
            </motion.h3>
            <motion.p
              className="text-gray-600 text-sm md:text-base lg:text-lg leading-relaxed"
              variants={textVariants}
              transition={{ delay: 0.1 }}
            >
              Blockchain-backed records give your donors confidence that every
              dollar goes where it should.
            </motion.p>
          </motion.div>

          {/* Real-Time Updates */}
          <motion.div
            className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-12 shadow-sm hover:shadow-lg transition-all duration-300"
            variants={itemVariants}
            whileHover={{
              y: -8,
              transition: { duration: 0.3 },
            }}
          >
            <motion.div className="mb-6 md:mb-8" variants={iconVariants}>
              <div className="relative w-16 h-16 md:w-20 md:h-20">
                {/* Bell with notification */}
                <motion.div
                  className="w-12 h-14 md:w-14 md:h-16 bg-gradient-to-b from-yellow-400 to-orange-400 rounded-t-full relative"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-1.5 md:w-4 md:h-2 bg-orange-500 rounded-b"></div>
                </motion.div>
                <motion.div
                  className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-purple-500 rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full"></div>
                  <motion.div
                    className="absolute top-0.5 right-0.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </motion.div>
              </div>
            </motion.div>
            <motion.h3
              className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 md:mb-4"
              variants={textVariants}
            >
              Real-Time Updates
            </motion.h3>
            <motion.p
              className="text-gray-600 text-sm md:text-base lg:text-lg leading-relaxed"
              variants={textVariants}
              transition={{ delay: 0.1 }}
            >
              Keep supporters engaged with photos, videos, and progress updates
              directly from your campaigns.
            </motion.p>
          </motion.div>

          {/* Earn While You Build */}
          <motion.div
            className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-12 shadow-sm hover:shadow-lg transition-all duration-300"
            variants={itemVariants}
            whileHover={{
              y: -8,
              transition: { duration: 0.3 },
            }}
          >
            <motion.div className="mb-6 md:mb-8" variants={iconVariants}>
              <div className="relative w-16 h-16 md:w-20 md:h-20">
                {/* Bar chart */}
                <motion.div
                  className="flex items-end gap-1 md:gap-2 h-12 md:h-16"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1,
                      },
                    },
                  }}
                >
                  {[6, 10, 8, 12, 16].map((height, index) => (
                    <motion.div
                      key={index}
                      className={`w-3 md:w-4 rounded-t ${
                        index === 0
                          ? "bg-purple-400"
                          : index === 1
                          ? "bg-pink-400"
                          : index === 2
                          ? "bg-green-400"
                          : index === 3
                          ? "bg-blue-400"
                          : "bg-teal-400"
                      }`}
                      variants={barChartVariants}
                      custom={height}
                    />
                  ))}
                </motion.div>
                <motion.div
                  className="absolute -top-1 md:-top-2 right-0 w-6 h-6 md:w-8 md:h-8"
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-full h-full"
                  >
                    <path
                      d="M7 17L17 7M17 7H7M17 7V17"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.div>
              </div>
            </motion.div>
            <motion.h3
              className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 md:mb-4"
              variants={textVariants}
            >
              Earn While You Build
            </motion.h3>
            <motion.p
              className="text-gray-600 text-sm md:text-base lg:text-lg leading-relaxed"
              variants={textVariants}
              transition={{ delay: 0.1 }}
            >
              Stake your nonprofit&apos;s funds in our liquidity pool to generate
              yield and sustain your mission long-term.
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Call to Action Button */}
        <motion.div className="text-center" variants={itemVariants}>
          <motion.button
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-8 py-4 md:px-16 md:py-6 rounded-full text-base md:text-xl font-medium shadow-lg flex items-center gap-3 md:gap-4 mx-auto hover:shadow-xl transition-all duration-300"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            ❤️ Start a Nonprofit Campaign
            <motion.svg
              className="w-5 h-5 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </motion.svg>
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default FeaturesSection;