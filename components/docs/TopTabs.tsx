"use client";

import { motion } from "framer-motion";

export default function TopTabs({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (tab: string) => void;
}) {
  const tabs = ["Get Started", "Policy Center", "Platform Fees", "Revenue"];

  return (
    <nav className="mt-4 mb-3 border-b border-gray-200">
      <ul className="flex whitespace-nowrap overflow-x-auto no-scrollbar gap-6 md:gap-20 text-[16px] md:text-[18px] font-medium">
        {tabs.map((tab) => {
          const isActive = active === tab;

          return (
            <li key={tab} className="relative flex-shrink-0">
              <button
                onClick={() => onSelect(tab)}
                className={`pt-2 pb-3 px-1 transition-colors ${
                  isActive
                    ? "text-navy-royal font-semibold"
                    : "text-gray-700 hover:text-navy-royal"
                }`}
              >
                {tab}
              </button>

              {isActive && (
                <motion.div
                  layoutId="topTabUnderline"
                  className="h-[2px] bg-navy-royal absolute bottom-0 left-0 right-0"
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
