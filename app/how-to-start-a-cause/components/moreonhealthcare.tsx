"use client";
import React from "react";
import { Button } from "@/components/button";
import { motion } from "framer-motion";
import Image from "next/image";

export default function MoreOnHealthcare() {
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
      className="w-full h-auto text-white flex flex-col justify-center items-start px-6 lg:px-10 py-10 gap-6 border bg-[#8C1823]"
    >
      <div className="text-xl">
        When Every Second Counts, Funding Shouldn’t Delay
      </div>
      <div className="text-base md:text-2xl lg:text-5xl font-semibold leading-relaxed">
        Patients, hospitals, and medical nonprofits often struggle to raise
        urgent funds due to lack of trust, slow transfers, or limited reach.
        RefreeG solves this by making healthcare fundraising global,
        transparent, and instant.
      </div>
      <Button className="bg-[#FAFAFA] hover:bg-[#5f0f17] hover:text-white border text-black px-10 py-4 flex items-center gap-2 rounded-full">
        Get started today
        <Image
          src="/images/arrow-right.png"
          height={20}
          width={20}
          alt="get started"
        />
      </Button>
    </motion.div>
  );
}
