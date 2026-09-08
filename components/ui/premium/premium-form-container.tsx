"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PremiumFormContainerProps {
  children: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  variant?: "premium" | "refreeg";
}

export function PremiumFormContainer({
  children,
  title,
  description,
  className,
  variant = "premium",
}: PremiumFormContainerProps) {
  if (variant === "refreeg") {
    return (
      <div className="min-h-screen w-full bg-[#F3F6F9] px-3 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
        <div className={cn("mx-auto max-w-6xl", className)}>
          <header className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#63748A]">
                <span className="h-2 w-2 rounded-full bg-[#73A942]" />
                Campaign builder
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.025em] text-[#10233F] sm:text-[32px]">
                {title}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#53647A]">
                {description}
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#D6DEE7] bg-white px-3 py-2 text-xs font-semibold text-[#53647A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#73A942]" />
              Draft saves automatically
            </div>
          </header>

          <main>{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full mesh-gradient px-3 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("max-w-4xl mx-auto", className)}
      >
        <div className="mb-6 text-center sm:mb-10 md:mb-12">
          <motion.h1
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-3 text-3xl font-extrabold text-gradient sm:mb-4 sm:text-4xl md:text-5xl"
          >
            {title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-auto max-w-2xl text-sm leading-6 text-gray-600 sm:text-base md:text-lg"
          >
            {description}
          </motion.p>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-4 sm:p-6 md:p-10 lg:p-12">{children}</div>
        </div>
      </motion.div>
    </div>
  );
}
