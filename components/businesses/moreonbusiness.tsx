"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

export default function MoreOnBusiness() {
  return (
    <motion.div
      initial={{
        scale: 0.95,
        marginLeft: "1rem",
        marginRight: "1rem",
        borderRadius: "1.5rem",
      }}
      whileInView={{
        scale: 1,
        marginLeft: "0rem",
        marginRight: "0rem",
        borderRadius: "0rem",
      }}
      viewport={{ amount: 0.6, once: false }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="w-full h-auto text-white flex flex-col justify-center items-start px-6 lg:px-10 py-10 gap-6 border bg-[#003E25]"
    >
      <div className="text-xl">More than Donations. A Growth Engine.</div>
      <div className="text-base md:text-2xl lg:text-5xl font-semibold leading-relaxed">
        RefreeG isn’t just about raising money — it’s about creating momentum
        for your business. With transparency, blockchain-backed trust, and yield
        opportunities, we give you the tools to build stronger.
      </div>
      <Link
        href="../dashboard/causes/create"
        className="bg-[#FAFAFA] border text-black px-10 py-4 flex items-center gap-2 rounded-full"
      >
        Get started today
        <Image
          src="/images/arrow-right.png"
          height={20}
          width={20}
          alt="get started"
        />
      </Link>
    </motion.div>
  );
}
