"use client";

import React from "react";
import { Zap, Terminal, ChevronRight } from "lucide-react";

export default function SectionAiBlueprint() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-bold tracking-wider uppercase">
          <Zap className="w-3 h-3" /> Agentic AI Integration
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900">
          The AI Integration Blueprint
        </h1>
        <p className="text-slate-500 text-lg leading-relaxed">
          RefreeG is designed to be a &quot;Headless Crowdfunding Engine.&quot; You can integrate 
          Large Language Models (LLMs) like GPT-4, Claude, or Gemini to autonomously 
          generate and manage campaigns.
        </p>
      </header>

      <section className="space-y-8">
        <div className="p-8 border border-slate-100 rounded-3xl bg-white shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm">1</span>
            The System Prompt
          </h3>
          <p className="text-slate-600 text-[15px]">
            To ensure your AI agent generates valid campaign data, use the following template in your system instructions:
          </p>
          <div className="bg-slate-900 rounded-2xl p-6 relative group">
            <pre className="text-blue-300 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
{`You are a RefreeG Campaign Architect. Your goal is to convert user requests into valid campaign JSON.
Strictly adhere to this schema:
- title: 5-100 chars
- description: 20-5000 chars (Markdown allowed)
- goal_amount: Integer in NGN
- payout_mode: "manual" or "automated"
- bank_account_number: 10 digits (NUBAN)
- bank_code: 3 digit bank code (e.g. "058")
- bank_account_name: Legal account holder name

ALWAYS validate the JSON structure against the /api/bot/campaigns/validate endpoint before final submission.`}
            </pre>
          </div>
        </div>

        <div className="p-8 border border-slate-100 rounded-3xl bg-slate-50 shadow-inner space-y-6">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm">2</span>
            Self-Correction Loop
          </h3>
          <p className="text-slate-600 text-[15px]">
            AI models occasionally hallucinate or miss schema constraints. Implement a validation loop to ensure 100% reliability:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { step: "Send to /validate", desc: "Pass the AI-generated JSON to our validation endpoint." },
              { step: "Handle Errors", desc: "If validation fails, feed the error messages back into the AI's context." },
              { step: "Re-generate", desc: "Ask the AI to fix specific fields based on the validation feedback." },
              { step: "Finalize", desc: "Once /validate returns success, call the /create endpoint." },
            ].map((item, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-blue-600" /> {item.step}
                </h4>
                <p className="text-slate-500 text-[13px]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
