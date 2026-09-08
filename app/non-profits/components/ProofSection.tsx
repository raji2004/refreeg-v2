"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function ProofSection() {
  const [isHovered, setIsHovered] = useState(false);

  // Animation variants with proper TypeScript types
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1] as const
      }
    }
  };

  const coinVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.6,
        type: "spring" as const,
        stiffness: 200
      }
    },
    hover: {
      scale: 1.2,
      rotate: 10,
      transition: {
        duration: 0.3
      }
    }
  };

  const shieldVariants = {
    hidden: { scale: 0 },
    visible: {
      scale: 1,
      transition: {
        duration: 0.8,
        type: "spring" as const,
        stiffness: 150
      }
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse" as const
      }
    }
  };

  return (
    <motion.div 
      className="bg-gradient-to-br from-gray-50 to-blue-50 flex items-start justify-center px-4 sm:px-6 pt-16 sm:pt-20 pb-8 sm:pb-12 relative overflow-hidden"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={containerVariants}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
        {/* Content Section */}
        <motion.div 
          className="space-y-6 sm:space-y-8 order-2 lg:order-1"
          variants={containerVariants}
        >
          {/* Trust Badge */}
          <motion.div 
            className="inline-block"
            variants={itemVariants}
          >
            <motion.div 
              className="bg-white/80 backdrop-blur-sm rounded-full px-4 py-3 sm:px-6 sm:py-3 border border-gray-200/50 shadow-sm"
              whileHover={{ 
                scale: 1.02,
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)"
              }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-xs sm:text-sm text-gray-600 font-medium text-center sm:text-left">
                Powered by vetted, audited smart contracts. Withdraw anytime.
                Your funds remain yours — always.
              </p>
            </motion.div>
          </motion.div>

          {/* Main Heading */}
          <motion.div 
            className="space-y-3 sm:space-y-4"
            variants={itemVariants}
          >
            <motion.h1 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight text-center lg:text-left"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Donors Want Proof. We Help You.{" "}
            </motion.h1>
            <motion.h2 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-purple-600 text-center lg:text-left"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              Provide It.
            </motion.h2>
          </motion.div>

          {/* Description */}
          <motion.p 
            className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-lg text-center lg:text-left mx-auto lg:mx-0"
            variants={itemVariants}
          >
            RefreeG&apos;s fraud-compliance system and blockchain-powered
            transparency protect donors and elevate your credibility, so your
            nonprofit stands out as trustworthy and professional.
          </motion.p>

          {/* CTA Button */}
          <motion.div 
            className="pt-2 sm:pt-4 flex justify-center lg:justify-start"
            variants={itemVariants}
          >
            <motion.button
              className={`group relative overflow-hidden bg-purple-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl ${
                isHovered ? "shadow-2xl" : "shadow-lg"
              }`}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              whileHover={{ 
                scale: 1.05,
                y: -2
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10 flex items-center gap-2 sm:gap-3">
                Get started
                <motion.svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{ x: isHovered ? 5 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </motion.svg>
              </span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100"
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Visual Section */}
        <motion.div 
          className="relative flex justify-center lg:justify-end order-1 lg:order-2 mt-8 sm:mt-[135px]"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="relative scale-75 sm:scale-90 md:scale-100">
            {/* Background Glow */}
            <motion.div 
              className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 to-yellow-400/20 blur-2xl rounded-full"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse" as const
              }}
            />

            {/* Main Visual Container */}
            <motion.div 
              className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-6 sm:p-8 border border-white/20"
              whileHover={{ 
                y: -5,
                transition: { duration: 0.3 }
              }}
            >
              {/* Coins Stack */}
              <div className="relative mb-4 sm:mb-6">
                {/* Gold Coins */}
                <div className="flex items-end justify-center space-x-1 sm:space-x-2">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full shadow-lg"
                      variants={coinVariants}
                      whileHover="hover"
                      animate={{
                        y: [0, -10, 0],
                        rotate: i % 2 === 0 ? [0, 5, 0] : [0, -5, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse" as const,
                        delay: i * 0.1
                      }}
                    >
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 flex items-center justify-center">
                        <span className="text-xs font-bold text-yellow-800">
                          $
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Shield with Checkmark */}
              <motion.div 
                className="flex justify-center mb-4 sm:mb-6"
                variants={shieldVariants}
                animate="pulse"
              >
                <div className="relative">
                  <motion.div 
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center shadow-xl"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-purple-500 rounded-full flex items-center justify-center">
                      <motion.svg
                        className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                          duration: 0.5, 
                          delay: 1,
                          type: "spring" as const
                        }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </motion.svg>
                    </div>
                  </motion.div>
                  {/* Pulse Animation */}
                  <motion.div 
                    className="absolute inset-0 bg-blue-400 rounded-full"
                    animate={{ 
                      scale: [1, 1.5, 1],
                      opacity: [0.2, 0, 0.2]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse" as const
                    }}
                  />
                </div>
              </motion.div>

              {/* Floating Elements */}
              <motion.div
                className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 w-4 h-4 sm:w-6 sm:h-6 bg-green-400 rounded-full"
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.5, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse" as const,
                  delay: 0.5
                }}
              />
              <motion.div
                className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-3 h-3 sm:w-4 sm:h-4 bg-purple-400 rounded-full"
                animate={{ 
                  y: [0, -10, 0],
                  x: [0, 5, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse" as const,
                  delay: 1
                }}
              />
              <motion.div
                className="absolute top-1/2 -right-4 sm:-right-6 w-2 h-2 sm:w-3 sm:h-3 bg-purple-400 rounded-full"
                animate={{ 
                  scale: [1, 2, 1],
                  opacity: [1, 0, 1]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: "reverse" as const,
                  delay: 1.5
                }}
              />
            </motion.div>

            {/* Additional Floating Coins */}
            <motion.div
              className="absolute -top-6 -left-6 sm:-top-8 sm:-left-8 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full shadow-lg"
              animate={{
                y: [0, -20, 0],
                rotate: [0, 180, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse" as const
              }}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-bold text-yellow-800">₦</span>
              </div>
            </motion.div>

            <motion.div
              className="absolute -bottom-3 -right-6 sm:-bottom-4 sm:-right-8 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-300 to-green-500 rounded-full shadow-lg"
              animate={{
                y: [0, 15, 0],
                rotate: [0, -180, -360],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                repeatType: "reverse" as const,
                delay: 1
              }}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-green-200 to-green-400 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-bold text-green-800">₦</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-blue-100/20 to-transparent rounded-full"
          animate={{
            x: [0, 20, 0],
            y: [0, -20, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: "reverse" as const
          }}
        />
        <motion.div 
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-yellow-100/20 to-transparent rounded-full"
          animate={{
            x: [0, -20, 0],
            y: [0, 20, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse" as const,
            delay: 2
          }}
        />
      </div>
    </motion.div>
  );
}