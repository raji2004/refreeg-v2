"use client";
import React from "react";
import { Button } from "../ui/button";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function CreatorStory() {
  return (
    <motion.div
      initial={{
        scale: 0.95,
        marginLeft: "1rem",
        marginRight: "1rem",
        borderRadius: "1.5rem",
      }}
      whileInView={{
        scale: 1,
        marginLeft: "0rem",
        marginRight: "0rem",
        borderRadius: "0rem",
      }}
      viewport={{ amount: 0.6, once: false }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="w-full h-auto text-white flex flex-col justify-center items-start px-6 lg:px-10 py-10 gap-6 border bg-secondary"
    >
      <div className="text-xl">
        Own your story. Claim your tag. Start creating causes the world can
        believe in.
      </div>
      <div className="text-base md:text-2xl lg:text-5xl font-semibold leading-relaxed">
        Join thousands of creators building impact every day. Your tag is your
        key to being seen and supported. Don’t just dream it. Tag it. Fund it.
        Grow it.
      </div>
      <Link href="/dashboard/causes/create">
        <Button className="mt-auto hover:underline left-0 px-0 py-3 outline-none border-0">
          Get started today
          <Image
            src="/images/chevronRight3.svg"
            height={20}
            width={20}
            alt="get started"
          />
        </Button>
      </Link>
    </motion.div>
  );
}
