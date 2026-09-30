"use client";

import Image from "next/image";
import React from "react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
  return (
    <div className="relative w-full h-[380px] pt-16 flex justify-center text-white overflow-hidden">
      {}
      <Image
        src="/herodisaster.png"
        alt="disaster hero"
        fill
        className="object-fill"
        priority
      />

      {}
      <div className="absolute inset-0" />

      {}
      <div className="relative z-10 text-black px-6 w-full">
        <div className="px-10 w-full flex flex-col-reverse md:flex md:flex-row justify-between items-center">
          {}
          <motion.div
            className="w-full lg:w-8/12"
            initial={{ opacity: 0, x: -80 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            viewport={{ once: true }}
          >
            <div className="w-full lg:w-5/6 mb-7">
              <div className="text-xl md:text-2xl lg:text-4xl font-semibold pb-2 md:pb-2 lg:mb-1">
                When Disaster Strikes, <br /> Hope Should Arrive Faster
              </div>
              <div className="text-sm md:text-base lg:text-lg text-gray-700">
                RefreeG empowers communities, NGOs, and relief organizations to
                raise urgent funds for disaster response. From floods to fires,
                donors can send help instantly in fiat or crypto — with
                transparent tracking and impact updates.
              </div>
            </div>

            {}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/dashboard/causes/create">
                <Button className="text-xs md:text-base flex items-center gap-x-2 text-white p-2 bg-[#151314] rounded">
                  Launch a Disaster Relief Campaign
                  <Image
                    src="/images/chevron-right-2.png"
                    height={12}
                    width={12}
                    alt="get started"
                  />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {}
          <motion.div
            className="hidden lg:block w-full md:w-4/12"
            initial={{ opacity: 0, scale: 0.8, rotate: 3 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            viewport={{ once: true }}
          >
            <Image
              className="mx-auto md:ml-auto hidden md:block"
              src={"/disaster.png"}
              width={550}
              height={500}
              alt="disaster illustration"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
