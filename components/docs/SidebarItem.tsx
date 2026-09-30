"use client";

import { motion } from "framer-motion";
import React from "react";

export default function SidebarItem({
  label,
  icon: Icon,
  selected,
  onSelect,
}: {
  label: string;
  icon: React.ElementType;
  selected: string;
  onSelect: (label: string) => void;
}) {
  const active = selected === label;

  return (
    <li
      onClick={() => onSelect(label)}
      className="relative flex items-center cursor-pointer px-3 py-2 rounded-md overflow-hidden"
    >
      {}
      {active && (
        <motion.div
          layoutId="sidebar-highlight"
          className="absolute inset-0 bg-slate-100 rounded-md"
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        />
      )}

      {}
      <div className="relative z-10 flex items-center">
        <Icon
          className={`w-4 h-4 mr-2 transition-colors ${
            active
              ? "text-[#0A2A5C]"
              : "text-gray-500 group-hover:text-[#0A2A5C]"
          }`}
        />
        <span
          className={`transition-colors ${
            active ? "text-[#0A2A5C] font-semibold" : "text-gray-700"
          }`}
        >
          {label}
        </span>
      </div>
    </li>
  );
}
