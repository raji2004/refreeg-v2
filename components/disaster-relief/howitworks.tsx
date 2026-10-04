"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import React from "react";
import { Button } from "../ui/button";
import Link from "next/link";

export default function HowItWorks() {
  const steps = [
    {
      num: 1,
      title: "Create a Relief Campaign",
      text: "Share the disaster details and urgent needs.",
      align: "self-start",
    },
    {
      num: 2,
      title: "Verify for Trust",
      text: "Build donor confidence with KYC and cause verification.",
      align: "self-center",
    },
    {
      num: 3,
      title: "Receive Donations Instantly",
      text: "Secure funding globally in multiple currencies.",
      align: "self-end",
    },
    {
      num: 4,
      title: "Deliver Updates",
      text: "Show proof of aid with images, videos, and on-ground reports.",
      align: "self-start",
    },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: i * 0.15,
        ease: "easeOut" as any,
      },
    }),
  };

  return (
    <div className="w-full h-auto text-black flex flex-col px-6 lg:px-10 py-16 gap-6">
      {}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center w-full text-2xl md:text-3xl lg:text-5xl font-bold"
      >
        How It <span className="text-gray-500">Works!</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-center w-full mx-auto text-gray-600"
      >
        From Need to Care, Faster.
      </motion.div>

      {}
      <div className="w-full flex flex-col gap-16 mb-12 text-lg">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            custom={i}
            className={`${step.align} text-left`}
          >
            <div className="w-fit border px-4 py-2 mb-4 rounded-full bg-[#0A0A0B] text-white text-center">
              {step.num}
            </div>
            <div className="font-bold text-xl mb-1">{step.title}</div>
            <div className="text-gray-700 leading-relaxed">{step.text}</div>
          </motion.div>
        ))}
      </div>

      {/* Animated Button */}
      <motion.div
        className="w-full flex justify-start"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        viewport={{ once: true }}
      >
        <Link href="/dashboard/causes/create">
          <Button className="bg-[#FAFAFA] border text-black px-10 py-4 flex items-center gap-2 rounded-full hover:bg-gray-100 transition">
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
    </div>
  );
}
