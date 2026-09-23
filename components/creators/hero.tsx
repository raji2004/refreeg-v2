"use client";

import Image from "next/image";
import React from "react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";

export default function Hero() {
  const floatTransition = {
    y: {
      duration: 2,
      yoyo: Infinity,
      ease: "easeInOut",
    },
  };

  return (
    <div className="relative w-full h-[367px] flex justify-center text-white overflow-hidden">
      {}
      <motion.div
        className="relative z-10 text-center md:mt-12 lg:mt-20 text-black max-w-3xl px-6"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border rounded-full w-fit px-4 py-2 mb-4 bg-[#FAFAFA] text-sm font-medium inline-flex items-center justify-center mx-auto"
        >
          <Image
            src="/users.png"
            alt="users"
            width={20}
            height={20}
            className="mr-2"
          />
          Join thousands already fundraising on RefreeG
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-4xl md:text-5xl font-bold mb-4"
        >
          Your Impact. Your Tag. Your Community.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-lg md:text-xl mb-6"
        >
          On RefreeG, every creator gets a unique tag and URL — your digital
          identity <br /> where people can discover, follow, and support your
          cause.
        </motion.p>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Button className="bg-secondary hover:bg-blue-500 text-white px-20 py-3 rounded-sm flex items-center justify-center mx-auto">
            Claim your tag
            <Image
              src="/images/chevron-right-2.png"
              height={20}
              width={20}
              alt="get started"
              className="ml-2"
            />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
