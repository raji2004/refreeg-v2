"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import Numbers from "@/components/numbers";
import Link from "next/link";

const SLIDE_UP_DURATION = 0.8;

const slideUp = (delay = 0) => ({
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: SLIDE_UP_DURATION,
    delay,
    ease: [0.4, 0, 0.2, 1] as const,
  },
});

const scaleIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: {
    duration: SLIDE_UP_DURATION,
    delay,
    ease: [0.4, 0, 0.2, 1] as const,
  },
});

export default function Hero() {
  const [imagesShouldMove, setImagesShouldMove] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setImagesShouldMove(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-screen bg-gray-50 py-8 md:py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <motion.div
        className="absolute inset-0 opacity-30 md:opacity-50"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        <Image
          src="/map.svg"
          alt="Background map"
          fill
          className="object-contain"
          priority
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 via-gray-50/60 to-gray-50/80 pointer-events-none lg:hidden z-0" />

      <div className="relative max-w-7xl mx-auto">
        <div className="relative flex justify-center items-center min-h-[500px] md:min-h-[600px] mb-10">
          <motion.div
            className="absolute top-4 left-4 md:top-0 md:left-20 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: SLIDE_UP_DURATION,
              delay: 0.2,
              ease: [0.4, 0, 0.2, 1] as const,
            }}
          >
            <motion.div
              className="w-full h-full rounded-full overflow-hidden shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl transition-shadow duration-300 backdrop-blur-sm lg:backdrop-blur-0"
              animate={
                imagesShouldMove
                  ? {
                      y: [0, -10, 0],
                    }
                  : { y: 0 }
              }
              transition={
                imagesShouldMove
                  ? {
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: [0.4, 0, 0.6, 1] as const,
                      delay: 1.2,
                    }
                  : { duration: 0.5 }
              }
            >
              <Image
                src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                alt="Disaster relief volunteers"
                fill
                sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, (max-width: 1024px) 160px, 192px"
                className="object-cover hover:scale-110 transition-transform duration-500"
              />
            </motion.div>
          </motion.div>
          <motion.div
            className="absolute top-4 right-4 md:top-0 md:right-20 w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-44 lg:h-44"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: SLIDE_UP_DURATION,
              delay: 0.4,
              ease: [0.4, 0, 0.2, 1] as const,
            }}
          >
            <motion.div
              className="w-full h-full rounded-full overflow-hidden shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl transition-shadow duration-300 backdrop-blur-sm lg:backdrop-blur-0"
              animate={
                imagesShouldMove
                  ? {
                      y: [0, -10, 0],
                    }
                  : { y: 0 }
              }
              transition={
                imagesShouldMove
                  ? {
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: [0.4, 0, 0.6, 1] as const,
                      delay: 1.4,
                    }
                  : { duration: 0.5 }
              }
            >
              <Image
                src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                alt="Community volunteers with boxes"
                fill
                sizes="(max-width: 640px) 80px, (max-width: 768px) 112px, (max-width: 1024px) 144px, 176px"
                className="object-cover hover:scale-110 transition-transform duration-500"
              />
            </motion.div>
          </motion.div>
          <motion.div
            className="absolute bottom-4 left-8 md:bottom-0 md:left-32 w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-44 lg:h-44"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: SLIDE_UP_DURATION,
              delay: 0.6,
              ease: [0.4, 0, 0.2, 1] as const,
            }}
          >
            <motion.div
              className="w-full h-full rounded-full overflow-hidden shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl transition-shadow duration-300 backdrop-blur-sm lg:backdrop-blur-0"
              animate={
                imagesShouldMove
                  ? {
                      y: [0, -10, 0],
                    }
                  : { y: 0 }
              }
              transition={
                imagesShouldMove
                  ? {
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: [0.4, 0, 0.6, 1] as const,
                      delay: 1.6,
                    }
                  : { duration: 0.5 }
              }
            >
              <Image
                src="https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                alt="Smiling volunteer in blue shirt"
                fill
                sizes="(max-width: 640px) 80px, (max-width: 768px) 112px, (max-width: 1024px) 144px, 176px"
                className="object-cover hover:scale-110 transition-transform duration-500"
              />
            </motion.div>
          </motion.div>
          s
          <motion.div
            className="absolute left-2 top-1/2 transform -translate-y-1/2 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: SLIDE_UP_DURATION,
              delay: 0.8,
              ease: [0.4, 0, 0.2, 1] as const,
            }}
          >
            <motion.div
              className="w-full h-full rounded-full overflow-hidden shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl transition-shadow duration-300 backdrop-blur-sm lg:backdrop-blur-0"
              animate={
                imagesShouldMove
                  ? {
                      y: [0, -10, 0],
                    }
                  : { y: 0 }
              }
              transition={
                imagesShouldMove
                  ? {
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: [0.4, 0, 0.6, 1] as const,
                      delay: 1.8,
                    }
                  : { duration: 0.5 }
              }
            >
              <Image
                src="https://images.unsplash.com/photo-1593113598332-cd288d649433?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
                alt="Volunteer distributing food"
                fill
                sizes="(max-width: 640px) 64px, (max-width: 768px) 96px, (max-width: 1024px) 128px, 160px"
                className="object-cover hover:scale-110 transition-transform duration-500"
              />
            </motion.div>
          </motion.div>
          <motion.div
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: SLIDE_UP_DURATION,
              delay: 1.0,
              ease: [0.4, 0, 0.2, 1] as const,
            }}
          >
            <motion.div
              className="w-full h-full rounded-full overflow-hidden shadow-lg md:shadow-xl hover:shadow-xl md:hover:shadow-2xl transition-shadow duration-300 backdrop-blur-sm lg:backdrop-blur-0"
              animate={
                imagesShouldMove
                  ? {
                      y: [0, -10, 0],
                    }
                  : { y: 0 }
              }
              transition={
                imagesShouldMove
                  ? {
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: [0.4, 0, 0.6, 1] as const,
                      delay: 2.0,
                    }
                  : { duration: 0.5 }
              }
            >
              <Image
                src="https://images.unsplash.com/photo-1616680214084-22670de1bc82?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                alt="Community volunteer with boxes"
                fill
                sizes="(max-width: 640px) 64px, (max-width: 768px) 96px, (max-width: 1024px) 128px, 160px"
                className="object-cover hover:scale-110 transition-transform duration-500"
              />
            </motion.div>
          </motion.div>
          <div className="text-center max-w-2xl mx-auto px-4 z-10 relative">
            <motion.div
              className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-2xl -m-4 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            />

            <div className="relative z-20">
              <motion.h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-6 md:mb-8 leading-tight"
                {...slideUp(0.3)}
              >
                Fund Change. Build Trust.
                <br />
                <span className="text-gray-700">Create Impact.</span>
              </motion.h1>

              <motion.div
                className="mb-8 md:mb-12 max-w-xl mx-auto"
                {...slideUp(0.5)}
              >
                <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed bg-white/80 backdrop-blur-sm rounded-lg p-4 lg:bg-transparent lg:backdrop-blur-0 lg:p-0">
                  RefreeG gives nonprofits a transparent and powerful way to
                  raise funds globally. From disaster relief to community
                  projects, we make it easy for donors to trust your mission and
                  support your cause.
                </p>
              </motion.div>

              <Link href="/dashboard/causes/create" passHref>
                <motion.button
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 md:px-8 md:py-4 rounded-lg text-base md:text-lg shadow-lg relative z-20 cursor-pointer"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: SLIDE_UP_DURATION,
                    delay: 0.7,
                    ease: [0.4, 0, 0.2, 1] as const,
                    y: {
                      duration: 2,
                      repeat: Infinity,
                      repeatType: "reverse",
                      ease: "easeInOut",
                    },
                  }}
                  whileHover={{
                    scale: 1.05,
                    y: -3,
                    transition: {
                      duration: 0.3,
                      y: { duration: 0.5, ease: "easeInOut" },
                    },
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  Start Your Nonprofit Campaign
                  <span className="ml-2">→</span>
                </motion.button>
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <Numbers />
      </div>
    </section>
  );
}
