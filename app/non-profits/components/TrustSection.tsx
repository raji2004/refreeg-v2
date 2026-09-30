"use client";

import React from "react";
import { motion } from "framer-motion";

const TrustSection = () => {
  return (
    <section className="relative bg-white py-12 md:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.h2
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 md:mb-8 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Because Every Donation{" "}
              <span className="text-purple-600">Deserves Trust.</span>
            </motion.h2>
          </motion.div>

          {}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            viewport={{ once: true, margin: "-100px" }}
          >
            {}
            <motion.div
              className="mb-8 md:mb-12"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3 md:mb-4">
                Nonprofits struggle with donor skepticism and fragmented
                fundraising tools.
              </h3>
              <div className="w-16 md:w-20 h-1 bg-red-500 mb-3 md:mb-4"></div>
            </motion.div>

            {}
            <motion.div
              className="mb-6 md:mb-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3 md:mb-4">
                RefreeG solves this by combining:
              </h3>
              <ul className="space-y-2 md:space-y-3 text-base md:text-lg text-gray-600">
                <motion.li
                  className="flex items-start"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  <span className="text-green-500 mr-2 md:mr-3">✓</span>
                  Blockchain transparency
                </motion.li>
                <motion.li
                  className="flex items-start"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  viewport={{ once: true }}
                >
                  <span className="text-green-500 mr-2 md:mr-3">✓</span>
                  Multi-currency donations
                </motion.li>
                <motion.li
                  className="flex items-start"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  viewport={{ once: true }}
                >
                  <span className="text-green-500 mr-2 md:mr-3">✓</span>
                  Real-time updates
                </motion.li>
              </ul>
              <p className="text-base md:text-lg text-gray-600 mt-3 md:mt-4">
                so every donor knows their contribution is making a difference.
              </p>
            </motion.div>

            {}
            <motion.button
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 md:px-8 md:py-4 rounded-lg text-base md:text-lg shadow-lg transition-all duration-300 transform hover:scale-105"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{
                scale: 1.05,
                y: -2,
                transition: { duration: 0.3 },
              }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              viewport={{ once: true }}
            >
              Get started today
              <span className="ml-2">→</span>
            </motion.button>
          </motion.div>
        </div>
      </div>

      {}
      <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-purple-100 rounded-full -translate-y-16 md:-translate-y-32 translate-x-16 md:translate-x-32 opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 md:w-48 md:h-48 bg-green-100 rounded-full translate-y-12 md:translate-y-24 -translate-x-12 md:-translate-x-24 opacity-50"></div>
    </section>
  );
};

export default TrustSection;
