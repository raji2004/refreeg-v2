"use client";

import React from "react";
import SidebarItem from "./SidebarItem";
import {
  X,
  Home,
  FileText,
  Users,
  HeartHandshake,
  LifeBuoy,
  Zap,
  Key,
  Terminal,
  Activity,
  ShieldAlert,
  Play,
} from "lucide-react";

export default function MobileSidebar({
  open,
  onClose,
  selected,
  onSelect,
  activeTab = "Get Started",
}: {
  open: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (label: string) => void;
  activeTab?: string;
}) {
  const platformItems = [
    { label: "Overview", icon: Home },
    { label: "Introduction", icon: FileText },
    { label: "For Fundraisers", icon: Users },
    { label: "For Donors", icon: HeartHandshake },
    { label: "Support", icon: LifeBuoy },
  ];

  const items = platformItems;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/40 transition-opacity md:hidden ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={onClose}
    >
      <div
        className={`absolute left-0 top-0 h-full w-64 bg-white border-r px-4 py-6 transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute top-4 right-4 p-1" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>

        <ul className="space-y-3 mt-10">
          {items.map((item) => (
            <SidebarItem
              key={item.label}
              label={item.label}
              icon={item.icon}
              selected={selected}
              onSelect={(v) => {
                onSelect(v);
                onClose();
              }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
