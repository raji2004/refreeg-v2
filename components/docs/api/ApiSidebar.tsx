"use client";

import React from "react";
import { 
  BookOpen, 
  Terminal, 
  Zap, 
  Settings, 
  ShieldCheck, 
  AlertCircle,
  Play,
  Box
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export default function ApiSidebar({
  selected,
  onSelect,
  className = "",
}: {
  selected: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const sections: SidebarSection[] = [
    {
      title: "Getting Started",
      items: [
        { id: "Introduction", label: "Introduction", icon: <BookOpen className="w-4 h-4" /> },
        { id: "Authentication", label: "Authentication", icon: <ShieldCheck className="w-4 h-4" /> },
        { id: "Quickstart Guide", label: "Quickstart Guide", icon: <Zap className="w-4 h-4" /> },
        { id: "AI Integration Blueprint", label: "AI Integration Blueprint", icon: <Zap className="w-4 h-4" /> },
        { id: "Best Practices", label: "Best Practices", icon: <ShieldCheck className="w-4 h-4" /> },
      ],
    },
    {
      title: "Campaigns API",
      items: [
        { id: "Create Campaign", label: "Create Campaign", icon: <Terminal className="w-4 h-4" /> },
        { id: "Retrieve Campaign", label: "Retrieve Campaign", icon: <Terminal className="w-4 h-4" /> },
        { id: "List Campaigns", label: "List Campaigns", icon: <Settings className="w-4 h-4" /> },
        { id: "List Campaign Donations", label: "List Campaign Donations", icon: <Settings className="w-4 h-4" /> },
        { id: "Update Campaign", label: "Update Campaign", icon: <Settings className="w-4 h-4" /> },
        { id: "Pause/Resume Campaign", label: "Pause/Resume Campaign", icon: <Settings className="w-4 h-4" /> },
        { id: "Cancel Campaign", label: "Cancel Campaign", icon: <Settings className="w-4 h-4" /> },
        { id: "AI Blueprint Validation", label: "Validate (AI)", icon: <Zap className="w-4 h-4" /> },
        { id: "List Categories", label: "Categories", icon: <BookOpen className="w-4 h-4" /> },
        { id: "Report Campaign", label: "Report Fraud", icon: <AlertCircle className="w-4 h-4" /> },
      ],
    },
    {
      title: "Banks API",
      items: [
        { id: "Manage Banks", label: "Manage Banks", icon: <Terminal className="w-4 h-4" /> },
      ],
    },
    {
      title: "Donations API",
      items: [
        { id: "Initialize Donation", label: "Initialize", icon: <Terminal className="w-4 h-4" /> },
        { id: "Verify Donation", label: "Verify Payment", icon: <ShieldCheck className="w-4 h-4" /> },
        { id: "Retrieve Donation", label: "Retrieve Donation", icon: <Terminal className="w-4 h-4" /> },
      ],
    },
    {
      title: "Notifications",
      items: [
        { id: "Webhooks & Events", label: "Webhooks & Events", icon: <Settings className="w-4 h-4" /> },
        { id: "Manage Webhooks", label: "Manage Webhooks", icon: <Terminal className="w-4 h-4" /> },
      ],
    },
    {
      title: "Mobile KYC API",
      items: [
        { id: "Mobile KYC Overview", label: "Overview & Flow", icon: <BookOpen className="w-4 h-4" /> },
        { id: "Start Mobile KYC", label: "Start Verification", icon: <Terminal className="w-4 h-4" /> },
        { id: "Check Mobile KYC Status", label: "Check Status", icon: <ShieldCheck className="w-4 h-4" /> },
        { id: "Mobile KYC Session", label: "Session Decision", icon: <Terminal className="w-4 h-4" /> },
        { id: "Legacy Mobile KYC", label: "Legacy KYC Data", icon: <Box className="w-4 h-4" /> },
      ],
    },
    {
      title: "Resources",
      items: [
        { id: "API Playground", label: "Interactive Playground", icon: <Play className="w-4 h-4" /> },
        { id: "SDKs & Libraries", label: "SDKs & Libraries", icon: <Box className="w-4 h-4" /> },
        { id: "Error Reference", label: "Error Reference", icon: <AlertCircle className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <aside className={`w-full h-full overflow-y-auto pr-2 no-scrollbar ${className}`}>
      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h5 className="mb-3 text-[12px] font-bold uppercase tracking-wider text-gray-400 px-3">
              {section.title}
            </h5>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = selected === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#0A2A5C] text-white shadow-md shadow-blue-900/10"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <span className={`${isActive ? "text-white" : "text-gray-400"}`}>
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
