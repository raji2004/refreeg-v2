"use client";

import Image from "next/image";
import React from "react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

export default function HealthcareSupport() {
  const features = [
    {
      title: "Emergency Aid Funding",
      desc: "Raise urgent funds for surgeries, transplants, or critical treatments.",
      image: "/images/ambulance.png",
    },
    {
      title: "Hospitals & Clinics",
      desc: "Get support for medical equipment, infrastructure, and staff training.",
      image: "/images/findclinic.png",
    },
    {
      title: "Public Health Programs",
      desc: "Fund vaccination drives, maternal care, and rural healthcare outreach.",
      image: "/images/commercial.png",
    },
    {
      title: "Yield on Donations",
      desc: "Sustain long-term healthcare projects by earning while funds are held.",
      image: "/images/statscoin.png",
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.25,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as any },
    },
  };

  return (
    <div className="w-full h-auto px-6 md:px-0 mt-16 overflow-hidden">
      {}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center w-full text-2xl md:text-3xl lg:text-5xl font-bold mb-12"
      >
        How RefreeG Supports{" "}
        <span className="text-gray-500">Healthcare Causes</span>
        <p className="text-sm md:text-base lg:text-lg font-normal mt-3 text-gray-600">
          Transparent fundraising, global payments, and yield opportunities—all
          in one platform for healthcare support.
        </p>
      </motion.div>

      {}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
      >
        {features.slice(0, 3).map((itemData, index) => (
          <motion.div
            key={index}
            variants={item}
            whileHover={{ scale: 1.03 }}
            className="flex flex-col items-start gap-4 p-6 rounded-2xl border shadow-sm bg-white hover:shadow-md transition-all duration-300"
          >
            <Image
              src={itemData.image}
              width={60}
              height={60}
              alt={itemData.title}
            />
            <p className="font-semibold text-lg">{itemData.title}</p>
            <p className="text-gray-600 text-sm leading-relaxed">
              {itemData.desc}
            </p>
          </motion.div>
        ))}

        {}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="flex flex-col gap-8 md:col-span-3 md:flex-row"
        >
          {}
          <motion.div
            variants={item}
            whileHover={{ scale: 1.03 }}
            className="flex flex-col border items-start gap-4 p-6 rounded-2xl shadow-sm bg-white md:w-1/3 hover:shadow-md transition-all duration-300"
          >
            <Image
              src={features[3].image}
              width={60}
              height={60}
              alt={features[3].title}
            />
            <p className="font-semibold text-lg">{features[3].title}</p>
            <p className="text-gray-600 text-sm leading-relaxed">
              {features[3].desc}
            </p>
          </motion.div>

          {}
          <motion.div
            variants={item}
            className="flex justify-center items-center w-full md:w-2/3"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              <Link href="/dashboard/causes/create">
                <Button className="w-full bg-[#8C1823] hover:bg-[#861722] border px-10 py-6 flex items-center justify-center gap-2 rounded-full shadow transition-all duration-300">
                  <Image
                    src="/images/doctorsbag.png"
                    height={20}
                    width={20}
                    alt="get started"
                  />
                  Start a Healthcare Campaign
                  <Image
                    src="/images/arrow-right-1.png"
                    height={20}
                    width={20}
                    alt="get started"
                  />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
