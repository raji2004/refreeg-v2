"use client";

import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

export default function Numbers() {
  const stats = [
    {
      img: "/profile.png",
      alt: "profile",
      label: "Registered Donors",
      value: "2,000+",
    },
    {
      img: "/cash.png",
      alt: "cash",
      label: "Donated",
      value: "$5,000+",
    },
    {
      img: "/forms.png",
      alt: "forms",
      label: "Petition Signatures",
      value: "20,000+",
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" } as any,
    },
  };

  return (
    <motion.div
      className="w-full flex flex-col sm:flex-row justify-between items-center gap-8 sm:gap-0 px-4 sm:px-6 lg:px-12 py-10 text-black overflow-hidden"
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      {stats.map((itemData, index) => (
        <motion.div
          key={index}
          variants={item}
          whileHover={{ scale: 1.08, transition: { duration: 0.3 } }}
          className="
            flex flex-row sm:flex-col 
            items-center 
            text-left sm:text-right 
            gap-4 sm:gap-3 
            flex-1 w-full
          "
        >
          <div className="flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-full shadow-md flex-shrink-0">
            <Image
              src={itemData.img}
              alt={itemData.alt}
              width={50}
              height={50}
              className="w-10 h-10 sm:w-[60px] sm:h-[60px]"
            />
          </div>

          <div className="flex flex-col sm:items-center w-full">
            <div className="text-lg sm:text-2xl font-bold">
              {itemData.value}
            </div>
            <div className="text-gray-600 text-sm sm:text-base font-medium">
              {itemData.label}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
