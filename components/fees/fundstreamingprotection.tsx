"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as any },
  },
};

export default function FundStreamingProtection() {
  return (
    <motion.div
      className="w-full h-auto px-6 md:px-0 mt-16"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      {}
      <motion.div className="text-center w-full mb-8" variants={itemVariants}>
        <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-4">
          Fund Streaming <span className="text-gray-500">Protection</span>
        </h2>
        <p className="text-sm md:text-base text-gray-600 max-w-4xl mx-auto">
          Transparency for donors. Accountability for cause owners. Safety for
          everyone.
        </p>
      </motion.div>

      {}
      <motion.div className="max-w-5xl mx-auto" variants={itemVariants}>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 md:p-12">
          <p className="text-lg md:text-xl lg:text-2xl leading-relaxed text-gray-700 font-medium">
            For large donations, RefreeG uses{" "}
            <span className="font-bold text-gray-900">
              blockchain-based fund streaming
            </span>
            . This means donations are released gradually to the cause owner. If
            a donor spots suspicious activity, the stream can be paused and
            reviewed before all funds are released - this helps keep fraud on
            the platform at{" "}
            <span className="font-bold text-gray-900">almost 0%!</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
