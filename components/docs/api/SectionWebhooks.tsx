"use client";

import React from "react";
import { ShieldCheck, Info, Terminal } from "lucide-react";
import ApiEndpointDoc from "./ApiEndpointDoc";

export default function SectionWebhooks() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-extrabold text-slate-900">Webhooks</h1>
          <p className="text-slate-500 text-lg font-medium leading-relaxed">
            Stay in sync with donation events in real-time. We push events to your servers securely.
          </p>
        </header>

        <ApiEndpointDoc
           title="Register Webhook"
          method="POST"
          url="/api/bot/webhooks"
          description="Registers a new endpoint to receive real-time donation events."
          parameters={[
            { name: "url", type: "string", required: true, description: "Your HTTPS endpoint URL to receive POST requests." },
            { name: "events", type: "array<string>", required: true, description: "List of events to subscribe to (e.g., ['donation.success', 'campaign.completed'])." },
          ]}
          requestExample={`{
  "url": "https://server.com/api/refreeg-events",
  "events": ["donation.success"]
}`}
          responseExample={`{
  "status": "success",
  "data": {
    "webhook_id": "wh_456...",
    "signing_secret": "whsec_789abc..."
  }
}`}
        >
          <div className="mt-8 space-y-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              Supported Events & Payloads
            </h4>
            
            <div className="space-y-4">
              <div className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <code className="text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full text-[13px]">
                    donation.success
                  </code>
                  <span className="text-slate-400 text-[12px] font-medium italic">Sent immediately after a successful payment</span>
                </div>
                <pre className="bg-slate-50 p-4 rounded-xl text-[12px] font-mono text-slate-700 border border-slate-100 overflow-x-auto">
{`{
  "event": "donation.success",
  "created_at": "2024-03-20T12:00:00Z",
  "payload": {
    "id": "don_890abc",
    "campaign_id": "camp_123xyz",
    "amount": 5000,
    "tip_amount": 200,
    "donor_name": "John Doe",
    "status": "success",
    "reference": "ref_789...",
    "mode": "live"
  }
}`}
                </pre>
              </div>

              <div className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <code className="text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full text-[13px]">
                    campaign.created
                  </code>
                  <span className="text-slate-400 text-[12px] font-medium italic">Sent when a new campaign is initialized via API</span>
                </div>
                <pre className="bg-slate-50 p-4 rounded-xl text-[12px] font-mono text-slate-700 border border-slate-100 overflow-x-auto">
{`{
  "event": "campaign.created",
  "created_at": "2024-03-20T12:00:00Z",
  "payload": {
    "id": "camp_123xyz",
    "title": "Save the Forest",
    "goal_amount": 500000,
    "status": "active",
    "mode": "live",
    "created_at": "2024-03-20T12:00:00Z"
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        </ApiEndpointDoc>

        <ApiEndpointDoc
           title="List Webhooks"
          method="GET"
          url="/api/bot/webhooks"
          description="Retrieves a list of all your registered webhook endpoints."
          parameters={[]}
          responseExample={`{ "status": "success", "data": [{ "id": "wh_456...", "url": "https://...", "events": ["donation.success"] }] }`}
        />

        <ApiEndpointDoc
           title="Update Webhook"
          method="PATCH"
          url="/api/bot/webhooks/[id]"
          description="Updates the URL or events of an existing webhook endpoint."
          parameters={[
            { name: "url", type: "string", required: false, description: "New endpoint URL." },
            { name: "events", type: "array<string>", required: false, description: "Updated list of events." },
          ]}
          requestExample={`{ "events": ["donation.success", "campaign.completed"] }`}
          responseExample={`{ "status": "success", "data": { "id": "wh_456...", "events": ["donation.success", "campaign.completed"] } }`}
        />

        <ApiEndpointDoc
           title="Delete Webhook"
          method="DELETE"
          url="/api/bot/webhooks/[id]"
          description="Permanently deletes a webhook endpoint."
          parameters={[]}
          responseExample={`{ "status": "success", "message": "Webhook deleted successfully." }`}
        />

        <div className="space-y-8 pt-6">
          <div className="p-8 border-2 border-slate-900 rounded-3xl bg-slate-900 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-green-400" />
              Verifying Webhook Signatures
            </h3>
            <p className="text-slate-300 text-[14px] leading-relaxed">
              Every webhook contains a <code className="text-blue-400 font-bold bg-white/5 px-2 py-0.5 rounded">X-RefreeG-Signature</code> header. 
              Always verify this using your webhook&apos;s unique <span className="font-bold text-white px-1">signing_secret</span> to ensure the data is authentically from RefreeG.
            </p>

            <div className="bg-slate-950 p-6 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <Terminal className="w-4 h-4" /> signature verification (node.js)
              </div>
              <pre className="text-blue-300 font-mono text-[13px] leading-relaxed scrollbar-hide py-2">
{`// The header format: X-RefreeG-Signature: t=1234567890,v1=abc...
const sigHeader = req.headers["x-refreeg-signature"];
const [tPart, vPart] = sigHeader.split(",");
const timestamp = tPart.replace("t=", "");
const signature = vPart.replace("v1=", "");

// Reconstruct the signed payload
const body = JSON.stringify(req.body);
const hmac = crypto.createHmac("sha256", webhook_secret);
const expectedSig = hmac.update(\`\${timestamp}.\${body}\`).digest("hex");

if (signature === expectedSig) {
  // ✅ Request is authentic
}`}
              </pre>
            </div>
          </div>
        </div>

        <div className="p-8 border border-slate-100 rounded-3xl bg-amber-50/50 space-y-4">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-amber-600" />
            <h4 className="font-bold text-slate-900 text-lg">Retries & Reliability</h4>
          </div>
          <p className="text-slate-600 text-[14px] leading-relaxed">
             If your server responds with anything other than a **2xx Successful** status code, 
             RefreeG will retry the webhook delivery with an exponential backoff for up to **24 hours**. 
             Ensure your endpoints are idempotent to handle potential duplicate events.
          </p>
        </div>
      </div>
    </div>
  );
}
