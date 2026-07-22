"use client";

import React from "react";
import { Users, CreditCard, FileText } from "lucide-react";
import { motion } from "framer-motion";

const STAGGER_DELAY = 0.15;

export default function Statistics() {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-4xl mx-auto mb-4"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true, margin: "-50px" }}
    >
      {[
        {
          icon: Users,
          color: "blue",
          text: "Over 1,000 registered donors",
        },
        { icon: CreditCard, color: "green", text: "Over ₦2,000 donated" },
        {
          icon: FileText,
          color: "purple",
          text: "Over 1,000 signatures on petitions",
        },
      ].map((stat, index) => (
        <motion.div
          key={index}
          className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.6,
            delay: index * STAGGER_DELAY,
            ease: "easeOut",
          }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          viewport={{ once: true }}
        >
          <motion.div
            className="flex items-center mb-4"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{
              duration: 0.5,
              delay: index * STAGGER_DELAY + 0.3,
              type: "spring",
              stiffness: 200,
            }}
            viewport={{ once: true }}
          >
            <div
              className={`w-12 h-12 bg-${stat.color}-100 rounded-full flex items-center justify-center`}
            >
              <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
            </div>
          </motion.div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">{stat.text}</h3>
        </motion.div>
      ))}
    </motion.div>
  );
}
