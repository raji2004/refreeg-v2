"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Image from "next/image";

import { User, CircleHelp } from "lucide-react";

// Custom Venus icon component (female symbol ♀)
const Venus = ({
  size = 32,
  className = "",
  ...props
}: React.SVGProps<SVGSVGElement> & { size?: number | string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="8" r="6" />
    <line x1="12" y1="14" x2="12" y2="22" />
    <line x1="8" y1="18" x2="16" y2="18" />
  </svg>
);

interface Step2Props {
  user: any;
  onNext: (gender: string) => void;
  onBack: () => void;
  onboardingData: any;
  updateOnboardingData: (key: string, value: any) => void;
}

// ✅ Replace symbols with Lucide React icons
const genderOptions = [
  { id: "male", label: "Male", icon: <User size={32} /> },
  { id: "female", label: "Female", icon: <Venus size={32} /> },
  { id: "other", label: "Other", icon: <CircleHelp size={32} /> },
];

export default function Step2({
  user,
  onNext,
  onBack,
  onboardingData,
  updateOnboardingData,
}: Step2Props) {
  const [selectedGender, setSelectedGender] = useState<string | null>(
    onboardingData.gender || null,
  );

  const handleNext = () => {
    if (!selectedGender) return;
    updateOnboardingData("gender", selectedGender);
    onNext(selectedGender);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-8">
      {/* 3D User Icon */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <Image
          src="/onboarding2.png"
          alt="3D User Icon"
          width={150}
          height={150}
        />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="text-center text-2xl font-semibold text-gray-900 mb-8 font-montserrat"
      >
        What&apos;s your gender?
      </motion.h2>

      {/* Gender Options */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-full flex items-center justify-center gap-4 flex-wrap"
      >
        {genderOptions.map((option) => (
          <motion.button
            key={option.id}
            onClick={() => setSelectedGender(option.id)}
            whileTap={{ scale: 0.97 }}
            className={`w-[200px] rounded-full border-2 px-6 py-4 text-center text-base font-medium transition-all duration-200 flex items-center justify-center space-x-3 ${
              selectedGender === option.id
                ? "bg-blue-50 border-blue-600 text-blue-700 shadow-md"
                : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
            }`}
          >
            <span className="text-2xl">{option.icon}</span>
            <span>{option.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Proceed Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-12 w-full max-w-md"
      >
        <Button
          onClick={handleNext}
          disabled={!selectedGender}
          className="w-full bg-blue-600 py-6 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          Proceed →
        </Button>
      </motion.div>
    </div>
  );
}
