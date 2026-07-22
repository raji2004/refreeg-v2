"use client";
import Image from "next/image";
import { FaArrowRight } from "react-icons/fa6";
import { motion } from "framer-motion";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.2, ease: "easeOut" as any },
  }),
};

export default function MoreThanCrowdfunding() {
  return (
    <section className="w-full px-4 md:px-8 lg:px-16 py-16 md:py-20 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-16">
        <div>
          <motion.div
            className="inline-flex items-center px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200 text-gray-700 text-xs md:text-sm mb-6"
            custom={0}
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            Powered by vetted, audited smart contracts. Withdraw anytime. Your
            funds remain yours — always.
          </motion.div>
          <motion.h2
            className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]"
            custom={1}
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            RefreeG is More than Just
            <br className="hidden md:block" />{" "}
            <span className="text-gray-400"> a Crowdfunding Website </span>
          </motion.h2>
          <motion.p
            className="mt-4 md:mt-6 text-base md:text-lg text-slate-600"
            custom={2}
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            Don&apos;t wait. Start your cause today and turn support into real
            impact.
          </motion.p>
          <motion.div
            className="mt-8"
            custom={3}
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <motion.button
              className="inline-flex items-center gap-3 rounded-full bg-white text-slate-900 px-10 py-3 text-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.95 }}
            >
              Get started <FaArrowRight />
            </motion.button>
          </motion.div>
        </div>

        <motion.div
          className="relative flex justify-center lg:justify-end"
          custom={4}
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <div className="relative w-[460px] max-w-full aspect-[1.3/1]">
            <Image
              src="/crowdfund.png"
              alt="Crowdfunding illustration"
              fill
              priority={false}
              sizes="(max-width: 1024px) 100vw, 460px"
              className="object-contain drop-shadow-[0_20px_50px_rgba(16,24,40,0.15)]"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
