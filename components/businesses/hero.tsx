"use client";

import Image from "next/image";
import React from "react";
import Link from "next/link";
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
    <div className="relative w-full h-[600px] flex items-center justify-center text-white overflow-hidden">
      {}
      <Image
        src="/herobusiness.png"
        alt="business hero"
        fill
        className="object-cover"
        priority
      />

      {}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: [0, -20, 0], opacity: 1 }}
        transition={{ ...floatTransition, duration: 4 }}
        className="absolute top-0 left-0"
      >
        <Image src="/rocket.png" alt="rocket" width={200} height={200} />
      </motion.div>

      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: [0, 20, 0], opacity: 1 }}
        transition={{ ...floatTransition, duration: 4, delay: 0.3 }}
        className="absolute top-0 right-0"
      >
        <Image src="/filecase.png" alt="filecase" width={200} height={200} />
      </motion.div>

      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: [0, 20, 0], opacity: 1 }}
        transition={{ ...floatTransition, duration: 4, delay: 0.6 }}
        className="absolute bottom-0 left-0"
      >
        <Image src="/coinscale.png" alt="coinscale" width={200} height={200} />
      </motion.div>

      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: [0, -20, 0], opacity: 1 }}
        transition={{ ...floatTransition, duration: 4, delay: 0.9 }}
        className="absolute bottom-0 right-0"
      >
        <Image
          src="/targetbusiness.png"
          alt="targetbusiness"
          width={200}
          height={200}
        />
      </motion.div>

      {}
      <div className="absolute inset-0 " />

      {}
      <motion.div
        className="relative z-10 text-center text-black max-w-3xl px-6"
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
          Fuel Your Business Growth with Crowdfunding
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-lg md:text-xl mb-6"
        >
          Whether you’re launching a startup or scaling an existing business,
          RefreeG helps you raise funds transparently, attract supporters, and
          maximize every dollar through our unique yield feature.
        </motion.p>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Link
            href="../dashboard/causes/create"
            className="bg-[#008B73] hover:bg-green-700 text-white px-12 py-3 rounded-sm flex items-center justify-center mx-auto"
          >
            Start a Business Campaign
            <Image
              src="/images/chevron-right-2.png"
              height={20}
              width={20}
              alt="get started"
              className="ml-2"
            />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
