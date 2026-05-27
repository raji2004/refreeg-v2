"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ENDPOINT_GROUPS } from '../_data/endpoints';

export function ApiDocsSidebar() {
  const ALL_GROUPS = [...ENDPOINT_GROUPS, "Data Models"];
  const [activeGroup, setActiveGroup] = useState<string>(ALL_GROUPS[0] || "");

  const scrollToGroup = (group: string) => {
    const el = document.getElementById(`group-${group}`);
    if (el) {
      // Offset for sticky headers if any, or just scroll into view
      const yOffset = -20; 
      const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveGroup(group);
    }
  };

  // Track which group is currently in view
  useEffect(() => {
    // Small delay to let the DOM render
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          // Pick the first one that's intersecting
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const groupName = entry.target.getAttribute("data-group");
              if (groupName) {
                setActiveGroup(groupName);
                break;
              }
            }
          }
        },
        {
          rootMargin: "-20px 0px -70% 0px",
          threshold: 0
        }
      );

      ALL_GROUPS.forEach((group) => {
        const el = document.getElementById(`group-${group}`);
        if (el) {
          el.setAttribute("data-group", group);
          observer.observe(el);
        }
      });

      return () => observer.disconnect();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-slate-400 mb-3 px-3">
        Resources
      </h3>
      <nav className="space-y-0.5">
        {ALL_GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => scrollToGroup(group)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              activeGroup === group
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {group}
          </button>
        ))}
      </nav>
      
      <div className="mt-8 px-3 pt-6 border-t border-slate-200">
        <h3 className="text-[11px] uppercase tracking-[0.15em] font-bold text-slate-400 mb-3">
          Auth Legend
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-400 flex items-center justify-center">
             <span className="w-1 h-1 bg-orange-400 rounded-full"></span>
          </span>
          <span>Requires Bearer Token</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
           <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-500 flex items-center justify-center">
             <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
          </span>
          <span>Public Access</span>
        </div>
      </div>
    </div>
  );
}
