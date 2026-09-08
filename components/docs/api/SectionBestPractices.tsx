"use client";

import React from "react";
import { Info, ShieldCheck, Terminal, AlertCircle } from "lucide-react";

export default function SectionBestPractices() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="space-y-10">
        <header className="space-y-4">
          <h1 className="text-3xl font-extrabold text-slate-900">Developer Best Practices</h1>
          <p className="text-slate-500 text-lg font-medium leading-relaxed">
            Ensure long-term stability and reliability of your RefreeG integrations.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 border border-slate-100 rounded-3xl bg-blue-50/30 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-lg">Use the Sandbox First</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
               Always test your logic in the sandbox environment using **rg_test_sk_** keys. 
               Don&apos;t switch to production until you&apos;ve successfully verified a donation flow via webhooks.
            </p>
          </div>

          <div className="p-8 border border-slate-100 rounded-3xl bg-green-50/30 space-y-4">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-slate-900 text-lg">Handle Rate Limits Gracefully</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
               If your application hits a **429 Too Many Requests**, implement an exponential backoff strategy 
               before retrying. Respect our per-minute quotas to avoid being temporarily blocked.
            </p>
          </div>

          <div className="p-8 border border-slate-100 rounded-3xl bg-amber-50/30 space-y-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-lg">Flatten Data Objects</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
               While previous versions used nested objects for bank details, the production schema now uses 
               flattened fields (e.g., **bank_account_number**). Ensure your models match our latest definitions.
            </p>
          </div>

          <div className="p-8 border border-slate-100 rounded-3xl bg-red-50/30 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-slate-900 text-lg">Idempotent Webhooks</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
               Webhooks might be delivered more than once. Always check transaction references 
               against your database before marking a donation as processed to prevent double-counting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
