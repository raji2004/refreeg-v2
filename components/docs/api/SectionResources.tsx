"use client";

import React, { useState } from "react";
import { Info, ExternalLink, Terminal, ShieldCheck, BookOpen, Download, AlertCircle } from "lucide-react";
import Link from "next/link";
import ApiEndpointDoc from "./ApiEndpointDoc";

export function SectionErrorRef() {
  const errors = [
    { id: "bad_request", code: "400", desc: "Missing required fields or malformed JSON." },
    { id: "unauthorized", code: "401", desc: "Missing or invalid Secret Key." },
    { id: "forbidden", code: "403", desc: "Attempting to use a Test Key for a Live operation (or vice-versa)." },
    { id: "not_found", code: "404", desc: "The specified resource doesn't exist." },
    { id: "validation_error", code: "422", desc: "Semantic validation failed (e.g., description too short)." },
    { id: "rate_limit_exceeded", code: "429", desc: "API request quota reached. Default 60 req/min." },
    { id: "server_error", code: "500", desc: "Something went wrong on our end." },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900 italic uppercase tracking-tighter">Error Reference</h1>
        <p className="text-slate-500 text-lg">Standard error codes and troubleshooting guide.</p>
      </header>

      <div className="space-y-8">
        <div className="overflow-x-auto bg-white rounded-3xl border border-slate-100 shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">ID / Code</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">Description</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {errors.map((err, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 border-b border-slate-50 font-mono font-bold text-slate-900">{err.code}</td>
                  <td className="p-4 border-b border-slate-50 font-mono text-blue-600">{err.id}</td>
                  <td className="p-4 border-b border-slate-50 text-slate-500">{err.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Validation Errors Deep Dive */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Validation Errors (422)
          </h3>
          <p className="text-slate-500">
            RefreeG uses Zod for robust schema validation. When a request fails validation, 
            the <code className="text-blue-600 font-mono">details</code> object contains a map of 
            field names to their specific errors.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-[#0B1120] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Example Error Response</span>
              </div>
              <pre className="text-[13px] font-mono text-blue-300 leading-relaxed overflow-x-auto">
{`{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "details": {
      "title": {
        "_errors": ["Required"]
      },
      "description": {
        "_errors": ["At least 20 chars"]
      }
    }
  }
}`}
              </pre>
            </div>

            <div className="flex flex-col justify-center space-y-4">
              <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-2 font-mono italic tracking-tighter">Internal Structure</h4>
                <p className="text-sm text-blue-700 leading-relaxed">
                  The <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono">_errors</code> array 
                  contains human-readable strings explaining why the field failed. This architecture is AI-optimized for easy self-correction loops.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SectionResources() {
  const [activeTab, setActiveTab] = useState<"node" | "python">("node");

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="space-y-10">
        <header className="space-y-4">
          <h1 className="text-3xl font-extrabold text-slate-900">SDKs & Libraries</h1>
          <p className="text-slate-500 text-lg font-medium leading-relaxed">
            Accelerate development with our official language-specific libraries. We provide fully typed, ready-to-use SDKs for Node.js and Python.
          </p>
          <div className="flex items-start gap-4 p-5 border border-amber-200 bg-amber-50 rounded-2xl text-amber-800 mt-6">
            <Info className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Please Note: SDKs are Currently Local in the Project</p>
              <p className="text-sm mt-1 leading-relaxed">If you try to run <code>npm install @refreeg/sdk</code> right now, it will fail because we have not published it to the public NPM or PyPI registries yet! The source code generated resides in the <code>sdks/</code> directory of your repository. For immediate integration, you can import them locally into your backend.</p>
            </div>
          </div>
        </header>

        <div>
          {/* Tabs header */}
          <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-xl mb-8 max-w-sm">
            <button
              onClick={() => setActiveTab("node")}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                activeTab === "node" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Node.js
            </button>
            <button
              onClick={() => setActiveTab("python")}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                activeTab === "python" ? "bg-white text-yellow-700 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Python
            </button>
          </div>

          {/* Tab Content: Node */}
          {activeTab === "node" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-2xl">
                  <Terminal className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xl">Node.js SDK (TypeScript)</h3>
                  <p className="text-slate-500 text-sm">Full TypeScript support with comprehensive type definitions.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="p-6 bg-[#0B1120] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div></div>
                    <span className="ml-2 text-xs font-medium text-slate-500 font-mono">Manual Integration (Local)</span>
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto pb-2">
                    <code className="text-slate-500">{`# 1. Copy the /sdks/node directory to your project libs folder`}</code><br />
                    <code className="text-slate-500">{`# 2. Reference it in your imports`}</code>
                  </pre>
                </div>

                <div className="p-6 bg-[#0B1120] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <span className="ml-2 text-xs font-medium text-slate-500 font-mono">index.ts - Initialization</span>
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto pb-4">
                    <code className="text-purple-400">import</code> <code className="text-slate-300">{`{ Refreeg }`}</code> <code className="text-purple-400">from</code> <code className="text-green-300">&quot;./libs/refreeg-sdk&quot;</code>;
                    <br /><br />
                    <code className="text-slate-500">{`// Initialize the client`}</code><br />
                    <code className="text-purple-400">const</code> <code className="text-slate-300">refreeg</code> = <code className="text-purple-400">new</code> <code className="text-amber-300">Refreeg</code>({`{`}<br />
                    <code className="text-slate-300">&nbsp;&nbsp;apiKey: </code><code className="text-green-300">process.env.REFREEG_API_KEY</code>,<br />
                    {`}`});
                  </pre>
                </div>

                <div className="p-6 bg-[#0B1120] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <span className="ml-2 text-xs font-medium text-slate-500 font-mono">campaigns.ts - Full Campaign Lifecycle</span>
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto pb-4">
                    <code className="text-slate-500">{`// 1. Create a campaign`}</code><br />
                    <code className="text-purple-400">const</code> <code className="text-slate-300">campaign</code> = <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.campaigns.</code><code className="text-blue-300">create</code>({`{`}<br />
                    <code className="text-slate-300">&nbsp;&nbsp;title: </code><code className="text-green-300">&quot;Emergency Relief Fund&quot;</code>,<br />
                    <code className="text-slate-300">&nbsp;&nbsp;goal_amount: </code><code className="text-orange-300">500000</code><br />
                    <code className="text-slate-300">{`}`});</code><br /><br />
                    
                    <code className="text-slate-500">{`// 2. Fetch a single campaign & List all`}</code><br />
                    <code className="text-purple-400">const</code> <code className="text-slate-300">details</code> = <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.campaigns.</code><code className="text-blue-300">get</code>(<code className="text-slate-300">campaign.id</code>);<br />
                    <code className="text-purple-400">const</code> <code className="text-slate-300">allCampaigns</code> = <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.campaigns.</code><code className="text-blue-300">list</code>();<br /><br />
                    
                    <code className="text-slate-500">{`// 3. Update & Manage State`}</code><br />
                    <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.campaigns.</code><code className="text-blue-300">update</code>(<code className="text-slate-300">campaign.id</code>, {`{`} <code className="text-slate-300">title:</code> <code className="text-green-300">&quot;Updated Campaign&quot;</code> {`}`});<br />
                    <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.campaigns.</code><code className="text-blue-300">pause</code>(<code className="text-slate-300">campaign.id</code>);<br />
                    <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.campaigns.</code><code className="text-blue-300">resume</code>(<code className="text-slate-300">campaign.id</code>);<br />
                    <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.campaigns.</code><code className="text-blue-300">cancel</code>(<code className="text-slate-300">campaign.id</code>);<br /><br />

                    <code className="text-slate-500">{`// 4. Get all donatons for a campaign`}</code><br />
                    <code className="text-purple-400">const</code> <code className="text-slate-300">donors</code> = <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.campaigns.</code><code className="text-blue-300">donations</code>(<code className="text-slate-300">campaign.id</code>);
                  </pre>
                </div>

                <div className="p-6 bg-[#0B1120] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <span className="ml-2 text-xs font-medium text-slate-500 font-mono">finance.ts - Donations & Banks</span>
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto pb-4">
                    <code className="text-slate-500">{`// 1. Bank Configuration`}</code><br />
                    <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.banks.</code><code className="text-blue-300">register</code>({`{`} <code className="text-slate-300">account_number: </code><code className="text-green-300">&quot;0123456789&quot;</code><code className="text-slate-300">, bank_code: </code><code className="text-green-300">&quot;058&quot;</code> {`}`});<br />
                    <code className="text-purple-400">const</code> <code className="text-slate-300">myBanks</code> = <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.banks.</code><code className="text-blue-300">list</code>();<br /><br />
                    
                    <code className="text-slate-500">{`// 2. Process a Donation`}</code><br />
                    <code className="text-purple-400">const</code> <code className="text-slate-300">intent</code> = <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.donations.</code><code className="text-blue-300">initialize</code>({`{`}<br />
                    <code className="text-slate-300">&nbsp;&nbsp;campaign_id: </code><code className="text-green-300">&quot;cmp_12345&quot;</code>,<br />
                    <code className="text-slate-300">&nbsp;&nbsp;amount: </code><code className="text-orange-300">5000</code>,<br />
                    <code className="text-slate-300">&nbsp;&nbsp;email: </code><code className="text-green-300">&quot;donor@example.com&quot;</code><br />
                    <code className="text-slate-300">{`}`});</code><br /><br />

                    <code className="text-slate-500">{`// 3. Verify / Get Donation status`}</code><br />
                    <code className="text-purple-400">const</code> <code className="text-slate-300">verified</code> = <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.donations.</code><code className="text-blue-300">verify</code>(<code className="text-slate-300">intent.reference</code>);<br />
                    <code className="text-purple-400">const</code> <code className="text-slate-300">singleDonation</code> = <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.donations.</code><code className="text-blue-300">get</code>(<code className="text-slate-300">intent.id</code>);<br />
                  </pre>
                </div>

                <div className="p-6 bg-[#0B1120] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <span className="ml-2 text-xs font-medium text-slate-500 font-mono">webhooks.ts - Real-time Events</span>
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto pb-4">
                    <code className="text-purple-400">const</code> <code className="text-slate-300">webhook</code> = <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.webhooks.</code><code className="text-blue-300">register</code>({`{`}<br />
                    <code className="text-slate-300">&nbsp;&nbsp;url: </code><code className="text-green-300">&quot;https://api.vourapp.com/refreeg-events&quot;</code>,<br />
                    <code className="text-slate-300">&nbsp;&nbsp;events: [</code><code className="text-green-300">&quot;donation.successful&quot;</code><code className="text-slate-300">, </code><code className="text-green-300">&quot;campaign.completed&quot;</code><code className="text-slate-300">]</code><br />
                    {`}`});<br /><br />
                    <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.webhooks.</code><code className="text-blue-300">update</code>(<code className="text-slate-300">webhook.id</code>, {`{`} <code className="text-slate-300">url: </code><code className="text-green-300">&quot;https://new-api.vourapp.com&quot;</code> {`}`});<br />
                    <code className="text-purple-400">const</code> <code className="text-slate-300">allHooks</code> = <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.webhooks.</code><code className="text-blue-300">list</code>();<br />
                    <code className="text-blue-400">await</code> <code className="text-slate-300">refreeg.webhooks.</code><code className="text-blue-300">delete</code>(<code className="text-slate-300">webhook.id</code>);<br />
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Python */}
          {activeTab === "python" && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-50 rounded-2xl">
                  <Terminal className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xl">Python SDK</h3>
                  <p className="text-slate-500 text-sm">Synchronous bindings optimized for Django, Flask, or pure Python projects.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="p-6 bg-[#0B1120] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div></div>
                    <span className="ml-2 text-xs font-medium text-slate-500 font-mono">Manual Integration (Local)</span>
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto pb-2">
                    <code className="text-slate-500">{`# 1. Copy the /sdks/python directory to your project`}</code><br />
                    <code className="text-slate-500">{`# 2. Ensure you have 'requests' installed: pip install requests`}</code>
                  </pre>
                </div>

                <div className="p-6 bg-[#0B1120] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <span className="ml-2 text-xs font-medium text-slate-500 font-mono">main.py - Initialization</span>
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto pb-4">
                    <code className="text-purple-400">import</code> <code className="text-slate-300">os</code><br />
                    <code className="text-purple-400">from</code> <code className="text-slate-300">refreeg_sdk</code> <code className="text-purple-400">import</code> <code className="text-amber-300">Refreeg</code><br /><br />
                    <code className="text-slate-500">{`# Initialize the client`}</code><br />
                    <code className="text-slate-300">client = </code><code className="text-amber-300">Refreeg</code>(api_key=os.environ.get(<code className="text-green-300">&quot;REFREEG_API_KEY&quot;</code>))<br /><br />
                    <code className="text-slate-500">{`# Pro-tip: Use try/except for robust error handling`}</code><br />
                    <code className="text-purple-400">from</code> <code className="text-slate-300">refreeg_sdk.exceptions</code> <code className="text-purple-400">import</code> <code className="text-slate-300">RefreegError</code>
                  </pre>
                </div>

                <div className="p-6 bg-[#0B1120] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <span className="ml-2 text-xs font-medium text-slate-500 font-mono">campaigns.py - Full Campaign Lifecycle</span>
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto pb-4">
                    <code className="text-slate-500">{`# 1. Create a campaign`}</code><br />
                    <code className="text-slate-300">campaign = client.campaigns.create({`{`}</code><br />
                    <code className="text-green-300">&nbsp;&nbsp;&nbsp;&nbsp;&quot;title&quot;</code><code className="text-slate-300">: </code><code className="text-green-300">&quot;Medical Fund&quot;</code>,<br />
                    <code className="text-green-300">&nbsp;&nbsp;&nbsp;&nbsp;&quot;goal_amount&quot;</code><code className="text-slate-300">: </code><code className="text-orange-300">500000</code><br />
                    <code className="text-slate-300">{`}`}</code>)<br /><br />
                    
                    <code className="text-slate-500">{`# 2. Fetch a single campaign & List all`}</code><br />
                    <code className="text-slate-300">details = client.campaigns.get(campaign[<code className="text-green-300">&apos;id&apos;</code>])</code><br />
                    <code className="text-slate-300">all_campaigns = client.campaigns.list()</code><br /><br />
                    
                    <code className="text-slate-500">{`# 3. Update & Manage State`}</code><br />
                    <code className="text-slate-300">client.campaigns.update(campaign[<code className="text-green-300">&apos;id&apos;</code>], {`{`} <code className="text-green-300">&quot;title&quot;</code>: <code className="text-green-300">&quot;Updated Campaign&quot;</code> {`}`} )</code><br />
                    <code className="text-slate-300">client.campaigns.pause(campaign[<code className="text-green-300">&apos;id&apos;</code>])</code><br />
                    <code className="text-slate-300">client.campaigns.resume(campaign[<code className="text-green-300">&apos;id&apos;</code>])</code><br />
                    <code className="text-slate-300">client.campaigns.cancel(campaign[<code className="text-green-300">&apos;id&apos;</code>])</code><br /><br />

                    <code className="text-slate-500">{`# 4. Get all donatons for a campaign`}</code><br />
                    <code className="text-slate-300">donors = client.campaigns.donations(campaign[<code className="text-green-300">&apos;id&apos;</code>])</code>
                  </pre>
                </div>

                <div className="p-6 bg-[#0B1120] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <span className="ml-2 text-xs font-medium text-slate-500 font-mono">finance.py - Processing Donations</span>
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto pb-4">
                    <code className="text-slate-500">{`# 1. Bank Configuration`}</code><br />
                    <code className="text-slate-300">bank = client.banks.register({`{`}</code><br />
                    <code className="text-green-300">&nbsp;&nbsp;&nbsp;&nbsp;&quot;account_number&quot;</code><code className="text-slate-300">: </code><code className="text-green-300">&quot;0123456789&quot;</code>,<br />
                    <code className="text-green-300">&nbsp;&nbsp;&nbsp;&nbsp;&quot;bank_code&quot;</code><code className="text-slate-300">: </code><code className="text-green-300">&quot;058&quot;</code>,<br />
                    <code className="text-green-300">&nbsp;&nbsp;&nbsp;&nbsp;&quot;account_name&quot;</code><code className="text-slate-300">: </code><code className="text-green-300">&quot;John Doe&quot;</code><br />
                    <code className="text-slate-300">{`}`}</code>)<br />
                    <code className="text-slate-300">my_banks = client.banks.list()</code><br /><br />
                    
                    <code className="text-slate-500">{`# 2. Trigger a charge intent when user clicks 'Donate'`}</code><br />
                    <code className="text-slate-300">donation = client.donations.initialize({`{`}</code><br />
                    <code className="text-green-300">&nbsp;&nbsp;&nbsp;&nbsp;&quot;campaign_id&quot;</code><code className="text-slate-300">: </code><code className="text-green-300">&quot;cmp_12345&quot;</code>,<br />
                    <code className="text-green-300">&nbsp;&nbsp;&nbsp;&nbsp;&quot;amount&quot;</code><code className="text-slate-300">: </code><code className="text-orange-300">5000</code>,<br />
                    <code className="text-green-300">&nbsp;&nbsp;&nbsp;&nbsp;&quot;email&quot;</code><code className="text-slate-300">: </code><code className="text-green-300">&quot;donor@example.com&quot;</code>,<br />
                    <code className="text-green-300">&nbsp;&nbsp;&nbsp;&nbsp;&quot;name&quot;</code><code className="text-slate-300">: </code><code className="text-green-300">&quot;Zion Tech&quot;</code><br />
                    <code className="text-slate-300">{`}`}</code>)<br /><br />
 
                    <code className="text-slate-500">{`# 3. Verify / Get Donation status`}</code><br />
                    <code className="text-slate-300">status = client.donations.verify(reference=donation[<code className="text-green-300">&apos;reference&apos;</code>])</code><br />
                    <code className="text-slate-300">single_donation = client.donations.get(donation[<code className="text-green-300">&apos;id&apos;</code>])</code>
                  </pre>
                </div>

                <div className="p-6 bg-[#0B1120] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <span className="ml-2 text-xs font-medium text-slate-500 font-mono">webhooks.py - Real-time Events</span>
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto pb-4">
                    <code className="text-slate-300">webhook = client.webhooks.register({`{`}</code><br />
                    <code className="text-green-300">&nbsp;&nbsp;&nbsp;&nbsp;&quot;url&quot;</code><code className="text-slate-300">: </code><code className="text-green-300">&quot;https://api.vourapp.com/refreeg-events&quot;</code>,<br />
                    <code className="text-green-300">&nbsp;&nbsp;&nbsp;&nbsp;&quot;events&quot;</code><code className="text-slate-300">: [</code><code className="text-green-300">&quot;donation.successful&quot;</code><code className="text-slate-300">, </code><code className="text-green-300">&quot;campaign.completed&quot;</code><code className="text-slate-300">]</code><br />
                    <code className="text-slate-300">{`}`}</code>)<br /><br />
                    
                    <code className="text-slate-300">client.webhooks.update(webhook[<code className="text-green-300">&apos;id&apos;</code>], {`{`} <code className="text-green-300">&quot;url&quot;</code>: <code className="text-green-300">&quot;https://new-api.vourapp.com&quot;</code> {`}`} )</code><br />
                    <code className="text-slate-300">all_hooks = client.webhooks.list()</code><br />
                    <code className="text-slate-300">client.webhooks.delete(webhook[<code className="text-green-300">&apos;id&apos;</code>])</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
