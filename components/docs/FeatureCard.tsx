"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function FeatureCard({ img, text }: { img: string; text: string }) {
  return (
    <motion.div
      // Scroll animation
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}

      // Hover animation
      whileHover={{
        y: -6,
        scale: 1.02,
        boxShadow: "0 12px 24px rgba(0,0,0,0.08)"
      }}

      className="group bg-white border rounded-2xl p-6 shadow-sm cursor-pointer"
    >
      {/* ICON */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        transition={{ duration: 0.25 }}
        className="flex h-36 items-center justify-center"
      >
        <Image
          src={img}
          alt={text}
          width={112}
          height={112}
          className="object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </motion.div>

      {/* TEXT */}
      <motion.p
        initial={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.25 }}
        className="mt-4 text-[17px] font-medium text-gray-900 leading-relaxed"
      >
        {text}
      </motion.p>
    </motion.div>
  );
}
