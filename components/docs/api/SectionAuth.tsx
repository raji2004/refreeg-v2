"use client";

import React from "react";
import { ShieldCheck, LayoutDashboard, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SectionAuth() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Authentication
        </h1>
        <p className="text-slate-500 text-lg font-medium">
          All API requests must include your secret key in the Authorization
          header.
        </p>
      </header>

      <section className="space-y-8">
        <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <ShieldCheck className="w-32 h-32 text-blue-400" />
          </div>
          <div className="relative z-10 space-y-6">
            <h4 className="text-blue-400 text-[12px] uppercase font-bold tracking-[0.2em]">
              Bearer Token Authorization
            </h4>
            <div className="flex items-center gap-4 bg-slate-950 p-5 rounded-2xl border border-white/5">
              <code className="text-blue-300 font-mono text-[15px] flex-1">
                Authorization: Bearer rg_test_sk_abc123...
              </code>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 border border-slate-100 rounded-3xl bg-slate-50/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
              <h3 className="font-bold text-slate-900">Sandbox Environment</h3>
            </div>
            <p className="text-[14px] text-slate-600 leading-relaxed">
              Use keys starting with{" "}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-orange-700 font-bold">
                rg_test_sk_
              </code>{" "}
              to test your integrations. Sandbox requests do not initiate real
              bank transfers.
            </p>
            <ul className="text-[13px] text-slate-500 space-y-1.5 list-disc list-inside pt-1">
              <li>
                Donations are <strong>simulated instantly</strong> — no real
                Paystack checkout
              </li>
              <li>
                Webhooks fire with{" "}
                <code className="bg-slate-100 px-1 rounded text-xs">
                  mode: &quot;test&quot;
                </code>{" "}
                in the payload
              </li>
              <li>Test data is completely isolated from production</li>
              <li>Campaign ownership and bank verification still apply</li>
            </ul>
          </div>
          <div className="p-8 border border-slate-100 rounded-3xl bg-slate-50/30 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <h3 className="font-bold text-slate-900">Live Production</h3>
            </div>
            <p className="text-[14px] text-slate-600 leading-relaxed">
              Keys starting with{" "}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-green-700 font-bold">
                rg_live_sk_
              </code>{" "}
              are for production environments. Keep these keys extremely secure.
            </p>
            <ul className="text-[13px] text-slate-500 space-y-1.5 list-disc list-inside pt-1">
              <li>
                Donations go through <strong>real Paystack checkout</strong>
              </li>
              <li>Bank settlements are processed with actual funds</li>
              <li>
                Cannot access test campaigns or donations (and vice-versa)
              </li>
            </ul>
          </div>
        </div>

        <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-red-900">Security Warning</h5>
            <p className="text-sm text-red-700 leading-relaxed">
              Never share your **Secret Keys** or commit them to version
              control. If a key is compromised, rotate it immediately via the{" "}
              <Link
                href="/dashboard/developer/api-keys"
                className="font-bold underline"
              >
                API Management Dashboard
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="p-8 border border-blue-100 rounded-3xl bg-blue-50/30 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900">
              Mode Isolation Compliance
            </h3>
          </div>
          <p className="text-[14px] text-slate-600 leading-relaxed">
            RefreeG enforces strict environment isolation. Your{" "}
            <strong>API Key mode must match the Campaign mode</strong> for all
            transaction-related requests.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-white p-4 rounded-xl border border-blue-100 space-y-2 shadow-sm order-2 sm:order-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-500 bg-red-50 px-2 py-0.5 rounded-full inline-block mb-1">
                Invalid
              </span>
              <div className="text-[12px] font-mono text-slate-500 line-through decoration-red-400 decoration-2">
                rg_test_sk_...
              </div>
              <div className="text-xl font-bold text-slate-300">→</div>
              <div className="text-[12px] font-mono text-green-700 bg-green-50 px-2 py-1 rounded inline-block font-bold">
                live_campaign_id
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-100 space-y-2 shadow-sm order-1 sm:order-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mb-1">
                Valid
              </span>
              <div className="text-[12px] font-mono text-slate-700 font-bold">
                rg_test_sk_...
              </div>
              <div className="text-xl font-bold text-slate-400">→</div>
              <div className="text-[12px] font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block font-bold">
                test_campaign_id
              </div>
            </div>
          </div>
          <p className="text-[13px] text-slate-500 italic">
            Attempting to initiate a donation with a mismatched key will result
            in a{" "}
            <code className="bg-slate-100 px-1 rounded text-xs">
              400 Bad Request
            </code>{" "}
            with error code{" "}
            <code className="bg-slate-100 px-1 rounded text-xs">
              MODE_MISMATCH
            </code>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
