"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface Step5Props {
  user: any;
  onComplete: (destination?: string) => void | Promise<void>;
  onboardingData: any;
}

export default function Step5({
  user,
  onComplete,
  onboardingData,
}: Step5Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      {/* Image */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="mb-10"
      >
        <Image
          src="/onboardingSuccess.png" // replace with your imported Figma image
          alt="Success Illustration"
          width={250}
          height={250}
          className="mx-auto"
        />
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          Thank You,{" "}
          {onboardingData?.profile?.firstName || user?.name || "User"}!
        </h1>
        <p className="text-gray-600 text-base md:text-lg mb-10">
          You can start supporting causes that matter to you today!
        </p>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <Button
          onClick={() => onComplete("/causes")}
          className="bg-gray-200 text-gray-800 hover:bg-gray-300 px-6 py-6 rounded-lg text-base font-semibold"
        >
          Explore Causes →
        </Button>

        <Button
          onClick={() => onComplete()}
          className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-6 rounded-lg text-base font-semibold"
        >
          Go to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
