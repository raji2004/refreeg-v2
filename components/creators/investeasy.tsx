"use client";

import { ArrowRight } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { motion } from "framer-motion";

export default function InvestEasy() {
  const steps = [
    {
      id: 1,
      img: "/images/fly-boy.png",
      title: "Step 1",
      text: "Get donations from your community in fiat or crypto.",
    },
    {
      id: 2,
      img: "/locked-cash.png",
      title: "Step 2",
      text: "Lock a portion of your funds into our safe liquidity pools.",
    },
    {
      id: 3,
      img: "/coin-picker.png",
      title: "Step 3",
      text: "Earn competitive yields while your cause is live.",
    },
    {
      id: 4,
      img: "/coin-flow.png",
      title: "Step 4",
      text: "Your funds + yield are always in your control.",
    },
  ];

  return (
    <div className="w-full h-auto flex flex-col lg:flex-row justify-between items-start px-6 lg:px-10 py-10 gap-10 overflow-hidden">
      {}
      <motion.div
        className="w-full lg:w-2/4 flex flex-col justify-start items-start gap-6"
        initial={{ opacity: 0, x: -80 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        viewport={{ once: true }}
      >
        <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
          Investing made easier!
        </h1>
        <p className="text-lg text-gray-600">
          Sign up today and unlock the power of earning while you create.
        </p>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button className="bg-secondary hover:bg-blue-500 border px-10 py-4 flex items-center gap-2 rounded-full">
            <Image
              src="/images/plasticpricetag.png"
              height={20}
              width={20}
              alt="get started"
            />
            Claim your tag today
            <ArrowRight size={16} />
          </Button>
        </motion.div>
      </motion.div>

      {}
      <div className="w-full lg:w-2/4 flex flex-col justify-start items-center gap-10">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            className="flex flex-col justify-center items-center text-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: index * 0.2,
              ease: [0.43, 0.13, 0.23, 0.96],
            }}
            viewport={{ once: true }}
          >
            <Image
              src={step.img}
              alt={step.title}
              width={400}
              height={250}
              className="w-full h-auto hidden md:block"
            />
            <div className="mt-4 text-sm text-gray-700">
              <span className="font-semibold text-black">{step.title}</span>{" "}
              {step.text}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
