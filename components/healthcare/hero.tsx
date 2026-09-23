"use client";

import Image from "next/image";
import React from "react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <div className="relative w-full h-[600px] flex items-center justify-center text-white overflow-hidden">
      {}
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute inset-0"
      >
        <Image
          src="/healthcarehero.png"
          alt="healthcare hero"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/10" />
      </motion.div>

      {}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, y: 40 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, staggerChildren: 0.3 },
          },
        }}
        className="relative z-10 text-center text-black max-w-3xl px-6"
      >
        <motion.h1
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-4xl md:text-5xl font-bold mb-4"
        >
          Fund Hope. Save Lives.
        </motion.h1>

        <motion.p
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-lg md:text-xl mb-6"
        >
          RefreeG empowers hospitals, clinics, and healthcare nonprofits to
          raise funds transparently for treatments, equipment, and emergency
          response. Donors can give in fiat or crypto, track impact, and even
          earn yield while saving lives.
        </motion.p>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.8 }}
          whileHover={{ scale: 1.05 }}
        >
          <Link href="/dashboard/causes/create">
            <Button className="bg-[#C03744] hover:bg-[#a72f3b] text-white px-12 py-3 rounded-sm flex items-center justify-center mx-auto transition-all duration-300">
              Start a Healthcare Campaign
              <Image
                src="/images/chevron-right-2.png"
                height={20}
                width={20}
                alt="get started"
                className="ml-2"
              />
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
