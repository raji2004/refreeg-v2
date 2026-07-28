"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

// Animation variants for reuse
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
    transition: { duration: 0.6, ease: "easeOut" as any } 
  },
};

export default function DonorGuarantee() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div 
      className="w-full h-auto px-6 md:px-0 mt-16"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      {/* Animated Header */}
      <motion.div
        className="text-center w-full mb-8"
        variants={itemVariants}
      >
        <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-4">
          RefreeG&apos;s Donor <span className="text-gray-500">Guarantee</span>
        </h2>
        <p className="text-sm md:text-base text-gray-600 max-w-4xl mx-auto">
          Transparency for donors. Accountability for cause owners. Safety for everyone.
        </p>
      </motion.div>

      {/* Expandable Policy Section */}
      <motion.div
        className="max-w-5xl mx-auto"
        variants={itemVariants}
      >
        <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
          <motion.button
            className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-gray-100 transition-colors duration-200"
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.001 }}
            whileTap={{ scale: 0.999 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                </svg>
              </div>
              <span className="text-lg md:text-xl font-semibold text-gray-900">
                View full dispute policy
              </span>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDownIcon className="w-6 h-6 text-gray-600" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="p-6 md:p-8 pt-0 text-gray-700">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Dispute Resolution Policy</h3>
                    <p className="leading-relaxed">
                      RefreeG is committed to protecting both donors and cause owners through our comprehensive dispute resolution system. 
                      If you have concerns about how your donation is being used, you can initiate a dispute within 30 days of your contribution.
                    </p>
                    <h4 className="font-semibold text-gray-900">How it works:</h4>
                    <ul className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>File a dispute through your donor dashboard within 30 days</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>Our team reviews the case and contacts the cause owner for clarification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>If fraud is confirmed, remaining funds are frozen and refunds are processed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>All disputes are resolved within 5-7 business days</span>
                      </li>
                    </ul>
                    <p className="text-sm text-gray-600 mt-4">
                      For more information, contact our support team at support@refreeg.com
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}