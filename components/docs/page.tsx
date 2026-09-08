"use client";

import React, { useState } from "react";
import { Menu, Search } from "lucide-react";

import Sidebar from "@/components/docs/Sidebar";
import MobileSidebar from "@/components/docs/MobileSidebar";
import TopTabs from "@/components/docs/TopTabs";
import FeatureCard from "@/components/docs/FeatureCard";

export default function GetStartedPage() {
  // Sidebar highlight only
  const [sidebarSelection, setSidebarSelection] = useState("Overview");

  // Content heading stays fixed for now
  const [pageTitle] = useState("Overview");

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTop, setActiveTop] = useState("Get Started");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="w-full bg-slate-50">
      <div className="mx-auto max-w-[1500px] flex flex-col md:flex-row gap-4 md:gap-6 px-3 md:px-0 pt-3">

        {/* Sidebar */}
        <Sidebar
          selected={sidebarSelection}
          onSelect={setSidebarSelection}
          searchQuery={searchQuery}
        />

        {/* Mobile Sidebar */}
        <MobileSidebar
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          selected={sidebarSelection}
          onSelect={setSidebarSelection}
        />

        {/* MAIN CONTENT */}
        <main className="flex-1 max-w-full md:max-w-5xl pt-2 pb-8">

          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-3 mb-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 border rounded-lg bg-white shadow-sm"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>

            <h1 className="text-[20px] font-semibold text-gray-900">{pageTitle}</h1>
          </div>

          {/* SEARCH BAR */}
          <div className="mb-3">
            <div className="relative w-full max-w-sm">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search RefreeG…"
                className="h-9 w-full rounded-full border border-gray-200 bg-white pl-9 pr-3 text-sm shadow-sm"
              />
            </div>
          </div>

          {/* TOP TABS */}
          <TopTabs active={activeTop} onSelect={setActiveTop} />

          {/* INTRODUCTION HEADER */}
          <h1 className="text-[26px] font-semibold text-gray-900">Introduction</h1>
          <p className="text-[16px] mt-2 text-gray-600">
            Get familiar with crowdfunding and its countless applications.
          </p>

          <h2 className="mt-8 text-[18px] font-semibold text-gray-900">
            Welcome to RefreeG
          </h2>

          <hr className="border-t border-gray-200 my-4" />

          {/* BODY TEXT */}
          <p className="mt-3 text-[16px] leading-7 text-gray-700">
            RefreeG is Africa&apos;s people-powered crowdfunding platform built to help 
            individuals, creators, and communities raise funds for causes that matter, 
            transparently and securely. Whether you&apos;re an NGO driving social impact, 
            a student raising funds for a project, or a creator building community support, 
            RefreeG gives you the tools to make it happen.
          </p>

          <p className="mt-3 text-[16px] leading-7 text-gray-700">
            Our platform combines blockchain-powered transparency, real-time impact tracking, 
            and onchain yielding so you and your supporters can see exactly how every donation
            makes a difference.
          </p>

          {/* BULLET LIST */}
          <div className="mt-5">
            <p className="text-[16px] font-medium text-gray-900 mb-2">
              This guide will walk you through everything you need to get started:
            </p>

            <ul className="pl-5 list-disc text-[15px] text-gray-700 space-y-1">
              <li>How to create an account and verify your identity</li>
              <li>How to start your first cause or campaign</li>
              <li>How to receive and manage donations</li>
              <li>How to track campaign performance</li>
              <li>How to grow your community</li>
            </ul>
          </div>

          {/* WHY REFREEG — CARD */}
          <section className="mt-10">
            <div className="bg-white border shadow-sm rounded-2xl p-8 max-w-2xl">
              <h3 className="text-[20px] font-semibold text-gray-900">Why RefreeG?</h3>

              <p className="mt-3 text-[16px] text-gray-700 leading-7">
                We believe crowdfunding should be more than just raising money — it should 
                be about building trust, empowering change, and creating sustainable impact.
              </p>

              <a
                href="#"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#0A2A5C] group"
              >
                <span className="transition-all duration-300 group-hover:translate-x-1">
                  Start your campaign
                </span>

                <svg
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          </section>

          {/* FEATURE CARDS */}
          <section className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <FeatureCard img="/images/earn.png" text="Earn on-chain yields on donations." />
            <FeatureCard img="/images/verify.png" text="Show transparency via blockchain." />
            <FeatureCard img="/images/bell.png" text="Launch trusted causes that inspire action." />
          </section>
        </main>
      </div>
    </div>
  );
}
