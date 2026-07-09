"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function HopeTransparency() {
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
      transition: { duration: 0.8, ease: "easeOut" as any },
    },
  };

  const imageAnim = {
    hidden: { opacity: 0, scale: 0.95 },
    show: {
      opacity: 1,
      scale: 1,
      transition: { duration: 1, ease: "easeOut" as any },
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
      {/* Headings */}
      <motion.div
        className="text-center w-full text-2xl md:text-3xl lg:text-5xl font-bold"
        variants={item}
      >
        Transparency That{" "}
        <span className="text-gray-500">Builds Hope</span>
      </motion.div>

      <motion.div
        className="text-center w-full mx-auto text-gray-600"
        variants={item}
      >
        Because Donors Deserve Proof. Patients Deserve Trust.
      </motion.div>

      {/* Animated Image */}
      <motion.div
        className="w-full flex justify-center items-center mt-6"
        variants={imageAnim}
      >
        <Image
          src="/images/healthmap.jpg"
          alt="Transparency That Builds Hope"
          width={800}
          height={400}
          className="w-full h-auto mx-auto"
        />
      </motion.div>
    </motion.div>
  );
}
