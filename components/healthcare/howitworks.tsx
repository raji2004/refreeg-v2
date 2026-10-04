"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import Image from "next/image";
import Link from "next/link";

export default function HowItWorks() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.3 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 40 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as any },
    },
  };

  return (
    <motion.div
      className="w-full h-auto text-black flex flex-col px-6 lg:px-10 py-10 gap-6"
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      {}
      <motion.div
        className="text-center w-full text-2xl md:text-3xl lg:text-5xl font-bold"
        variants={item}
      >
        How it <span className="text-gray-500">Works!</span>
      </motion.div>

      <motion.div
        className="text-center w-full mx-auto text-gray-600"
        variants={item}
      >
        From Need to Care, Faster.
      </motion.div>

      {}
      <motion.div
        className="w-full flex flex-col gap-16 mb-12 text-lg"
        variants={container}
      >
        <motion.div className="self-start text-left" variants={item}>
          <div className="w-fit border px-4 py-1.5 mb-4 rounded-full bg-[#8C1823] text-white">
            1
          </div>
          <div className="font-bold">Create Your Campaign</div>
          <div>
            Share your patient story, hospital <br /> need, or healthcare
            mission.
          </div>
        </motion.div>

        <motion.div className="self-center text-left" variants={item}>
          <div className="w-fit border px-4 py-2 mb-4 rounded-full bg-[#8C1823] text-white">
            2
          </div>
          <div className="font-bold">Verify for Trust</div>
          <div>
            Build donor confidence through RefreeG’s <br /> secure KYC and
            compliance.
          </div>
        </motion.div>

        <motion.div className="self-end text-left" variants={item}>
          <div className="w-fit border px-4 py-2 mb-4 rounded-full bg-[#8C1823] text-white">
            3
          </div>
          <div className="font-bold">Raise Funds Globally</div>
          <div>
            Accept multi-currency donations, from <br /> fiat to crypto.
          </div>
        </motion.div>

        <motion.div className="self-start text-left" variants={item}>
          <div className="w-fit border px-4 py-2 mb-4 rounded-full bg-[#8C1823] text-white">
            4
          </div>
          <div className="font-bold">Deliver Proof</div>
          <div>
            Post recovery updates, medical reports, <br /> and photos to donors
            in real-time.
          </div>
        </motion.div>
      </motion.div>

      {}
      <motion.div
        className="w-full flex justify-start"
        variants={item}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
      >
        <Link href="/dashboard/causes/create">
          <Button className="bg-[#FAFAFA] border text-black px-10 py-4 flex items-center gap-2 rounded-full shadow-sm">
            Get Started
            <Image
              src="/images/arrow-right.png"
              height={20}
              width={20}
              alt="get started"
            />
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}
