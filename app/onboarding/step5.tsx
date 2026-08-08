"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Building2,
  Check,
} from "lucide-react";

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
  const isOrg = onboardingData.accountType === "organization";

  if (isOrg) {
    return (
      <div className="flex min-h-[520px] items-center justify-center py-4 text-center">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-3xl"
        >
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Building2 className="h-7 w-7" />
              <span className="absolute ml-12 mt-12 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
          </div>

          <h1 className="mt-7 text-3xl font-semibold text-slate-950 sm:text-4xl">
            Your organisation is ready
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            Welcome, {onboardingData?.profile?.firstName || user?.name || "Owner"}. You can now manage your workspace, invite colleagues, and create your first cause.
          </p>

          <p className="mx-auto mt-7 max-w-xl border-l-2 border-blue-700 bg-slate-50 px-4 py-3 text-left text-sm leading-6 text-slate-600">
            If you postponed owner verification, complete it before launching a fundraiser or receiving payouts.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              onClick={() => onComplete("/dashboard/causes/create")}
              className="h-12 bg-blue-700 px-6 text-white hover:bg-blue-800"
            >
              Create your first cause
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={() => onComplete()}
              variant="outline"
              className="h-12 border-slate-300 px-6 text-slate-700 hover:bg-slate-50"
            >
              Open workspace dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

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
