"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";

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
          <div className="w-fit border px-4 py-1.5 mb-4 rounded-full bg-secondary text-white">
            1
          </div>
          <div className="font-bold">Tell Your Story</div>
          <div>
            Give your campaign a name and write a short <br />
            description. Be clear, be personal, and tell people
            <br />
            why this cause matters.
          </div>
        </motion.div>

        <motion.div className="self-center text-left" variants={item}>
          <div className="w-fit border px-4 py-2 mb-4 rounded-full bg-secondary text-white">
            2
          </div>
          <div className="font-bold">Add Images & Videos</div>
          <div>
            Bring your story to life. Upload photos or record a quick video{" "}
            <br /> to connect emotionally with your supporters. Bring your story{" "}
            <br /> to life. Upload photos or record a quick video to connect{" "}
            <br />
            emotionally with your supporters.
          </div>
        </motion.div>

        <motion.div className="self-end text-left" variants={item}>
          <div className="w-fit border px-4 py-2 mb-4 rounded-full bg-secondary text-white">
            3
          </div>
          <div className="font-bold">Set Your Goal</div>
          <div>
            Decide how much you need to raise. <br /> RefreeG helps you set
            realistic targets <br /> and shows your progress in real time.
          </div>
        </motion.div>

        <motion.div className="self-start text-left" variants={item}>
          <div className="w-fit border px-4 py-2 mb-4 rounded-full bg-secondary text-white">
            4
          </div>
          <div className="font-bold">Verify & Build Trust</div>
          <div>
            Upload your KYC docs so donors know <br /> your campaign is real.
            Verified causes get <br /> more support, faster.
          </div>
        </motion.div>

        <motion.div className="self-end text-left" variants={item}>
          <div className="w-fit border px-4 py-2 mb-4 rounded-full bg-secondary text-white">
            5
          </div>
          <div className="font-bold"> Share & Grow</div>
          <div>
            Launch your campaign and share it with <br /> friends, family, and
            the world. Use your <br /> unique RefreeG tag and link to spread{" "}
            <br /> the word everywhere.
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
        <Button className="bg-[#FAFAFA] border text-black px-10 py-4 flex items-center gap-2 rounded-full shadow-sm">
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
  );
}
