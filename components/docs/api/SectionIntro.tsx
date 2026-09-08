"use client";

import React from "react";
import { Terminal, ShieldCheck, Info, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function SectionIntro() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          RefreeG Developer API
        </h1>
        <p className="text-xl text-slate-500 leading-relaxed font-medium max-w-2xl">
          Programmatically launch campaigns, manage donors, and scale social impact using our production-grade API infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "RESTful JSON", icon: <Terminal className="w-5 h-5 text-blue-600" />, desc: "Predictable resource-oriented URLs and full JSON bodies.", bg: "bg-blue-50" },
          { title: "Deterministic", icon: <ShieldCheck className="w-5 h-5 text-green-600" />, desc: "Standard HTTP codes and unambiguous response objects.", bg: "bg-green-50" },
          { title: "Multi-Region", icon: <Info className="w-5 h-5 text-orange-600" />, desc: "Native support for NGN, GHS, and other emerging markets.", bg: "bg-orange-50" },
        ].map((feat) => (
          <div key={feat.title} className="p-6 border border-slate-100 rounded-2xl bg-white hover:border-blue-200 transition-all shadow-sm">
            <div className={`${feat.bg} p-2.5 rounded-xl w-fit mb-4`}>
              {feat.icon}
            </div>
            <h3 className="font-bold text-slate-900 mb-1">{feat.title}</h3>
            <p className="text-slate-500 text-[13px] leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>

      <div className="space-y-8 pt-6">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 border-l-4 border-blue-600 pl-4">Core Concepts</h2>
          <p className="text-slate-600 leading-relaxed max-w-3xl">
            The RefreeG API is designed for robustness. Whether you&apos;re building a Discord bot, a mobile application, or any 
            third-party interface, our API provides the hooks you need to manage the complete donor lifecycle.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Standard Response Format</h3>
            <p className="text-sm text-slate-500">Every response follows a deterministic structure, making integration across languages seamless.</p>
            <div className="bg-slate-900 rounded-2xl p-6 shadow-xl overflow-x-auto">
              <pre className="text-blue-300 font-mono text-[13px]">
{`{
  "status": "success",
  "data": { ... },
  "meta": { "total": 100 } // Optional
}`}
              </pre>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Rate Limiting</h3>
            <p className="text-sm text-slate-500">We enforce limits to preserve quality of service. Current global defaults:</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="font-bold text-slate-900">60 Requests</span> / Minute (default for all routes)
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span className="font-bold text-slate-900">10 Requests</span> / Minute (write-heavy endpoints like Report Campaign)
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-[#0A2A5C] p-8 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative group">
        <div className="relative z-10 flex items-start gap-5">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <Info className="w-6 h-6 text-blue-300" />
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-white text-lg">
              API Policy & Visibility
            </h4>
            <p className="text-blue-100/70 leading-relaxed text-[15px] max-w-2xl">
              Campaigns created via API are **isolated** from the main RefreeG web portal. 
              They do not appear in platform search results or the featured sections. 
              You maintain full ownership of the user interface and the distribution channel.
            </p>
            <div className="pt-2">
              <Link href="/dashboard/developer" className="text-white font-bold flex items-center gap-2 group-hover:gap-3 transition-all text-sm">
                Go to Developer Dashboard <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
