"use client";

import React from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { motion, Variants } from "framer-motion";

export default function AllYouNeed() {
  const steps = [
    {
      number: 1,
      title: "Set Up Your Payout Details",
      desc: (
        <>
          Securely link your bank account and/ <br /> or wallet for easy
          withdrawals.
        </>
      ),
      align: "self-start text-left",
    },
    {
      number: 2,
      title: "Track Contributions",
      desc: (
        <>
          Monitor donations and campaign <br /> growth in real-time.
        </>
      ),
      align: "self-center text-left",
    },
    {
      number: 3,
      title: "Funds Disbursement",
      desc: (
        <>
          Funds donated to you get sent directly <br /> to your account in less
          than 48 hours.
        </>
      ),
      align: "self-end text-left",
    },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.3 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] },
    },
  };

  const bounceVariants: Variants = {
    hidden: { scale: 0.5, opacity: 0 },
    show: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 200,
        damping: 10,
      },
    },
  };

  return (
    <div className="w-full h-auto text-black flex flex-col px-6 lg:px-10 py-10 gap-6">
      {}
      <motion.div
        className="text-center w-full text-2xl md:text-3xl lg:text-5xl font-bold"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        Fast and Secure <br />
        <span className="text-gray-500">Withdrawals</span>
      </motion.div>

      <motion.div
        className="text-center w-full mx-auto text-gray-600"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        viewport={{ once: true }}
      >
        Getting your funds is as easy as raising them. RefreeG gives you
        complete control and visibility over your payout process.
      </motion.div>

      {}
      <motion.div
        className="w-full flex flex-col gap-16 text-lg"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        {steps.map((step, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className={step.align}
          >
            <motion.div
              className="w-fit border px-4 py-1.5 mb-4 rounded-full bg-[#003E25] text-white text-center font-semibold"
              variants={bounceVariants}
            >
              {step.number}
            </motion.div>

            <div className="font-bold">{step.title}</div>
            <div className="text-gray-700">{step.desc}</div>
          </motion.div>
        ))}
      </motion.div>

      {}
      <motion.div
        className="w-full flex justify-start"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        viewport={{ once: true }}
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button className="bg-[#FAFAFA] border text-black px-10 py-4 flex items-center gap-2 rounded-full">
            Get Started
            <Image
              src="/images/arrow-right.png"
              height={20}
              width={20}
              alt="get started"
            />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
