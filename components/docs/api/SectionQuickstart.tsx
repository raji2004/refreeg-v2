"use client";

import React from "react";
import Link from "next/link";
import { Copy, Terminal, ChevronRight } from "lucide-react";

export default function SectionQuickstart() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Quickstart Guide
        </h1>
        <p className="text-slate-500 text-lg font-medium leading-relaxed">
          The fastest way to get your first campaign live programmatically.
        </p>
      </header>

      <section className="space-y-12">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/30">1</span>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Generate API Keys</h3>
          </div>
          <p className="text-slate-600 leading-relaxed text-[15px] pl-12">
            Navigate to the <Link href="/dashboard/developer" className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4 decoration-blue-200">Developer Dashboard</Link> and 
            generate a set of Sandbox keys. You will need the **rg_test_sk_...** key to proceed.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/30">2</span>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Prepare Request Body</h3>
          </div>
          <p className="text-slate-600 leading-relaxed text-[15px] pl-12">
            Construct a JSON object with your campaign details. Use the flattened bank parameters 
            to simplify settlement in a single request.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/30">3</span>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Run your first command</h3>
          </div>
          <div className="pl-12 space-y-4">
            <div className="bg-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl group transition-all duration-500 hover:scale-[1.01] border border-white/5">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Terminal className="w-48 h-48 text-blue-400 rotate-12" />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                    <span className="ml-4 text-[11px] font-bold text-blue-300 uppercase tracking-[0.2em]">bash / curl</span>
                  </div>
                  <button className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all hover:bg-white/10">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <pre className="text-blue-200 font-mono text-[14px] leading-relaxed overflow-x-auto py-2 scrollbar-hide">
                  <code className="block w-full">
{`curl -X POST https://refreeg.com/api/bot/campaigns \\
   -H "Authorization: Bearer YOUR_SECRET_KEY" \\
   -H "Content-Type: application/json" \\
   -d '{
     "title": "A Programmatic Fundraiser",
     "description": "My first campaign created via the RefreeG API to raise funds for community development.",
     "goal_amount": 100000,
     "payout_mode": "manual",
     "bank_account_number": "0000000000",
     "bank_code": "058",
     "bank_account_name": "Dev Test"
   }'`}
                  </code>
                </pre>
              </div>
            </div>
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex gap-4 mt-8">
               <div className="p-2.25 bg-blue-600 rounded-xl h-fit shadow-lg shadow-blue-200">
                  <ChevronRight className="w-4 h-4 text-white" />
               </div>
               <div className="space-y-1">
                  <h4 className="font-bold text-[#0A2A5C] text-[15px]">Check the Response</h4>
                  <p className="text-slate-500 text-[13px] leading-relaxed">
                     A successful request will return a **201 Created** status and a JSON object containing the campaign&apos;s unique UUID.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
