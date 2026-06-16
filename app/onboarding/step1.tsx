"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface Step1Props {
  user: any;
  onNext: (accountType: string) => void;
  onboardingData: any;
  updateOnboardingData: (key: string, value: any) => void;
}

const accountOptions = [
  { id: "individual", label: "I’m an individual" },
  { id: "creator", label: "I’m a creator" },
  { id: "non-profit", label: "I’m a non-profit" },
  { id: "organization", label: "I’m an organisation" },
  { id: "community", label: "I’m a community" },
  { id: "developer", label: "I’m a developer" },
];

export default function Step1({
  user,
  onNext,
  onboardingData,
  updateOnboardingData,
}: Step1Props) {
  const [selectedType, setSelectedType] = useState<string | null>(
    onboardingData.accountType || null,
  );

  const handleNext = () => {
    if (!selectedType) return;
    updateOnboardingData("accountType", selectedType);
    onNext(selectedType);
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Illustration */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <Image src="/onboarding1.png" alt="Illustration" width={128} height={128} />
      </motion.div>

      {/* Title */}
      <h2 className="text-center text-2xl font-semibold text-gray-900">
        What kind of account best fits you?
      </h2>

      {/* Options */}
      <div className="mt-8 w-full max-w-md space-y-3">
        {accountOptions.map((opt) => {
          const isSelected = selectedType === opt.id;

          return (
            <motion.button
              key={opt.id}
              onClick={() => setSelectedType(opt.id)}
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center justify-center gap-4 rounded-full border px-5 py-4 text-base font-medium transition-all relative
    ${
      isSelected
        ? "bg-blue-50 border-blue-600 text-blue-700"
        : "border-gray-200 hover:bg-gray-50"
    }`}
            >
              {/* Circle absolute left */}
              <div
                className={`flex items-center justify-center h-5 w-5 rounded-full border absolute left-5
      ${isSelected ? "border-blue-600" : "border-gray-400"}`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="innerCircle"
                    className="h-3 w-3 rounded-full bg-blue-600"
                  />
                )}
              </div>

              {/* Centered label */}
              <span className="mx-auto text-center">{opt.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Proceed Button */}
      <div className="mt-8 w-full max-w-md">
        <Button
          onClick={handleNext}
          disabled={!selectedType}
          className="w-full bg-blue-600 py-6 text-white hover:bg-blue-700"
        >
          Proceed →
        </Button>
      </div>
    </div>
  );
}
