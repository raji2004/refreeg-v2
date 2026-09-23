"use client";

import Image from "next/image";
import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import Numbers from "@/components/numbers";

export default function Hero() {
  return (
    <div className="relative w-full h-[600px] flex flex-col lg:mt-20 justify-center text-white overflow-hidden">
      {}
      {}

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
          Starting a Cause on RefreeG is Simple, Fast, and Transparent
        </motion.h1>

        <motion.p
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-lg md:text-xl mb-6"
        >
          Whether you’re raising money for a loved one, a business idea, or your
          community, RefreeG gives you the tools to launch a campaign that
          inspires trust and attracts support.
        </motion.p>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.8 }}
          whileHover={{ scale: 1.05 }}
        >
          <Link href="/causes/create">
            <Button className="bg-secondary hover:bg-[#a72f3b] text-white px-12 py-3 rounded-sm flex items-center justify-center mx-auto transition-all duration-300">
              Start a Cause Now
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

      <Numbers />
    </div>
  );
}
