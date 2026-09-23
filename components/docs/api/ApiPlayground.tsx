"use client";

import React, { useState } from "react";
import { Play, Copy, Check, Terminal, Send } from "lucide-react";

const ENDPOINTS = [
  {
    name: "Create Campaign",
    method: "POST",
    path: "/api/bot/campaigns",
    body: {
      title: "Help for Education",
      description:
        "Raising funds for a local school library project with high impact outcomes.",
      goal_amount: 500000,
      payout_mode: "manual",
      bank_account_number: "0123456789",
      bank_code: "058",
      bank_account_name: "John Doe",
    },
  },
  {
    name: "List Campaigns",
    method: "GET",
    path: "/api/bot/campaigns",
    body: {},
  },
  {
    name: "Update Campaign",
    method: "PATCH",
    path: "/api/bot/campaigns/{{campaign_id}}",
    body: {
      title: "Updated Campaign Title",
      description: "Updated description for the campaign...",
      goal_amount: 600000,
      bank_account_number: "0123456789",
      bank_code: "058",
      bank_account_name: "John Doe",
    },
  },
  {
    name: "Validate (AI)",
    method: "POST",
    path: "/api/bot/campaigns/validate",
    body: {
      title: "Suspicious Campaign",
      description:
        "A very clear and helpful campaign description for education purposes.",
      goal_amount: 1000,
      payout_mode: "manual",
      bank_account_number: "0123456789",
      bank_code: "058",
      bank_account_name: "Verification Admin",
    },
  },
  {
    name: "Register Bank",
    method: "POST",
    path: "/api/bot/banks",
    body: {
      bank_account_number: "0123456789",
      bank_code: "058",
      bank_account_name: "John Doe",
    },
  },
  {
    name: "List Banks",
    method: "GET",
    path: "/api/bot/banks",
    body: {},
  },
  {
    name: "Initialize Donation",
    method: "POST",
    path: "/api/bot/donations/initialize",
    body: {
      campaign_id: "uuid-from-creation",
      amount: 5000,
      name: "Sponsor Name",
      email: "sponsor@example.com",
    },
  },
  {
    name: "List Categories",
    method: "GET",
    path: "/api/bot/campaigns/categories",
    body: {},
  },
];

export default function ApiPlayground() {
  const [apiKey, setApiKey] = useState("");
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
  const [requestBody, setRequestBody] = useState(
    JSON.stringify(selectedEndpoint.body, null, 2),
  );
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      JSON.stringify(selectedEndpoint.body, null, 2),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = async () => {
    if (!apiKey) {
      alert("Please enter your Test API Key (Secret)");
      return;
    }

    setLoading(true);
    try {
      const finalBody = JSON.parse(requestBody);
      let finalPath = selectedEndpoint.path;
      if (finalPath.includes("{{campaign_id}}")) {
        const id = prompt("Enter Campaign ID:", "c8b3ecf6...");
        if (!id) {
          setLoading(false);
          return;
        }
        finalPath = finalPath.replace("{{campaign_id}}", id);
      }

      const res = await fetch(finalPath, {
        method: selectedEndpoint.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body:
          selectedEndpoint.method !== "GET"
            ? JSON.stringify(finalBody)
            : undefined,
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({
        status: "error",
        error: { message: "Failed to connect to API" },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 text-slate-300">
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Play className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            Interactive Playground
          </h2>
        </div>
        <div className="text-xs font-mono px-3 py-1 bg-slate-800 rounded-full text-slate-400">
          Sandbox Mode
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Configuration */}
        <div className="p-6 border-r border-slate-800 space-y-6 text-[15px]">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              API KEY
            </label>
            <input
              type="text"
              name="rg_api_key_test"
              autoComplete="off"
              placeholder="rg_test_sk_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ WebkitTextSecurity: "disc" } as any}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-blue-400 font-mono text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              ENDPOINT
            </label>
            <div className="flex flex-wrap gap-2">
              {ENDPOINTS.map((ep) => (
                <button
                  key={ep.name}
                  onClick={() => {
                    setSelectedEndpoint(ep);
                    setRequestBody(JSON.stringify(ep.body, null, 2));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedEndpoint.name === ep.name
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {ep.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                REQUEST BODY
              </label>
              <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-slate-800 rounded-md transition-colors text-slate-400"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <textarea
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              rows={8}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-300 font-mono text-sm leading-relaxed"
            />
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/30 group"
          >
            {loading ? (
              <Terminal className="w-5 h-5 animate-pulse" />
            ) : (
              <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            )}
            {loading ? "Executing Request..." : "Run Test Request"}
          </button>
        </div>

        {/* Right: Response */}
        <div className="p-6 bg-slate-950/50 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            RESPONSE
          </label>
          <div className="h-[400px] overflow-auto bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-sm">
            {response ? (
              <pre
                className={
                  response.status === "error"
                    ? "text-red-400"
                    : "text-green-400"
                }
              >
                {JSON.stringify(response, null, 2)}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                <Terminal className="w-12 h-12 opacity-10" />
                <p>Run a request to see the response</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
