"use client";

import React from "react";
import ApiEndpointDoc from "./ApiEndpointDoc";
import { Info, ShieldCheck, Smartphone, ArrowRight } from "lucide-react";

/**
 * Mobile KYC API Overview — explains the full Didit verification flow
 */
export function SectionMobileKycOverview() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl">
            <Smartphone className="w-6 h-6 text-violet-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Mobile KYC API</h1>
        </div>
        <p className="text-slate-500 text-lg font-medium leading-relaxed">
          Identity verification for the mobile app powered by{" "}
          <a href="https://didit.me" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-semibold">
            Didit
          </a>
          . Users complete KYC by scanning a government-issued ID and taking a live selfie
          through Didit&apos;s hosted verification flow.
        </p>
      </header>

      {/* Flow Diagram */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
          Verification Flow
        </h3>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
          {[
            {
              step: "1",
              title: "Create Session",
              desc: "Flutter app calls POST /api/mobile/kyc with Bearer token",
              color: "bg-blue-500",
            },
            {
              step: "2",
              title: "Open Verification URL",
              desc: "App opens the returned verification_url in a WebView or Didit Flutter SDK",
              color: "bg-violet-500",
            },
            {
              step: "3",
              title: "User Completes Flow",
              desc: "User scans their government ID and takes a selfie in Didit's UI",
              color: "bg-amber-500",
            },
            {
              step: "4",
              title: "Webhook Fires",
              desc: "Didit sends the result to POST /api/webhooks/didit (HMAC-verified)",
              color: "bg-emerald-500",
            },
            {
              step: "5",
              title: "Status Updates",
              desc: "App polls GET /api/mobile/kyc to detect approved/rejected status",
              color: "bg-green-500",
            },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className={`w-8 h-8 ${item.color} text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0`}>
                {item.step}
              </div>
              <div className="pt-0.5">
                <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auth note */}
      <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
        <ShieldCheck className="w-6 h-6 text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h5 className="font-bold text-blue-900">Authentication</h5>
          <p className="text-sm text-blue-700 leading-relaxed">
            All mobile KYC endpoints require a <strong>Bearer token</strong> in the{" "}
            <code className="text-xs bg-blue-100 px-1.5 py-0.5 rounded font-mono">Authorization</code>{" "}
            header, obtained from{" "}
            <code className="text-xs bg-blue-100 px-1.5 py-0.5 rounded font-mono">POST /api/mobile/auth/login</code>.
          </p>
        </div>
      </div>

      {/* Status values */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
          KYC Status Values
        </h3>
        <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">Meaning</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">User Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <code className="text-gray-500 font-mono text-[13px]">null</code>
                </td>
                <td className="px-4 py-3 text-[13px] text-gray-600">No KYC submitted yet</td>
                <td className="px-4 py-3 text-[13px] text-gray-600">Start verification</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <code className="text-amber-600 font-mono text-[13px] font-semibold">&quot;pending&quot;</code>
                </td>
                <td className="px-4 py-3 text-[13px] text-gray-600">In progress or under review</td>
                <td className="px-4 py-3 text-[13px] text-gray-600">Wait for result</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <code className="text-green-600 font-mono text-[13px] font-semibold">&quot;approved&quot;</code>
                </td>
                <td className="px-4 py-3 text-[13px] text-gray-600">Identity verified — all features unlocked</td>
                <td className="px-4 py-3 text-[13px] text-gray-600">None</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <code className="text-red-600 font-mono text-[13px] font-semibold">&quot;rejected&quot;</code>
                </td>
                <td className="px-4 py-3 text-[13px] text-gray-600">Verification failed</td>
                <td className="px-4 py-3 text-[13px] text-gray-600">Can retry with new session</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Environment variables */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
          Environment Variables
        </h3>
        <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">Variable</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { name: "DIDIT_CLIENT_SECRET", desc: "Didit API key (sent as x-api-key header)" },
                { name: "DIDIT_WORKFLOW_ID", desc: "KYC workflow ID from Didit Console" },
                { name: "DIDIT_WEBHOOK_SECRET", desc: "HMAC secret for webhook signature verification" },
              ].map((v) => (
                <tr key={v.name} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <code className="text-blue-600 font-mono text-[13px] font-semibold">{v.name}</code>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-gray-600">{v.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <hr className="border-t border-gray-100 my-10" />
    </div>
  );
}

/**
 * POST /api/mobile/kyc — Start KYC Verification
 */
export function SectionMobileKycStart() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">Start KYC Verification</h1>
        <p className="text-slate-500 text-lg font-medium leading-relaxed">
          Creates a Didit hosted verification session. The Flutter app should open the returned
          URL for the user to complete identity verification.
        </p>
      </header>

      <ApiEndpointDoc
        title="Create Verification Session"
        method="POST"
        url="/api/mobile/kyc"
        description="Creates a new Didit verification session. Returns a verification URL the mobile app should open in a WebView or via the Didit Flutter SDK. The verification result is delivered asynchronously via webhook."
        parameters={[
          {
            name: "callback_url",
            type: "string",
            required: false,
            description:
              'Deep link URL for post-verification redirect. Defaults to "refreeg://kyc/callback" if not provided.',
          },
        ]}
        requestExample={`// Minimal (uses default deep link)
POST /api/mobile/kyc
Authorization: Bearer <token>

// With custom callback
{
  "callback_url": "refreeg://kyc/callback"
}`}
        responseExample={`// 201 Created
{
  "success": true,
  "data": {
    "session_id": "a1b2c3d4-e5f6-...",
    "verification_url": "https://verification.didit.me/v3/session/a1b2c3d4..."
  }
}

// 409 Conflict (already approved)
{
  "success": false,
  "error": "KYC already approved"
}

// 409 Conflict (in progress)
{
  "success": false,
  "error": "A KYC verification is already in progress..."
}`}
      >
        <div className="p-5 bg-violet-50 rounded-xl border border-violet-100 space-y-3">
          <h5 className="font-bold text-violet-900 text-sm">Flutter Integration</h5>
          <pre className="bg-slate-900 text-violet-300 p-4 rounded-xl text-[13px] font-mono overflow-x-auto shadow-lg border border-slate-800">
            <code>{`// 1. Create session
final res = await http.post(
  Uri.parse('\$baseUrl/api/mobile/kyc'),
  headers: { 'Authorization': 'Bearer \$token' },
  body: jsonEncode({
    'callback_url': 'refreeg://kyc/callback',
  }),
);
final data = jsonDecode(res.body);
final url = data['data']['verification_url'];

// 2. Open in WebView
await Navigator.push(context, MaterialPageRoute(
  builder: (_) => WebViewPage(url: url),
));

// 3. Poll for status
Timer.periodic(Duration(seconds: 3), (timer) async {
  final status = await getKycStatus(token);
  if (status == 'approved' || status == 'rejected') {
    timer.cancel();
  }
});`}</code>
          </pre>
        </div>
      </ApiEndpointDoc>
    </div>
  );
}

/**
 * GET /api/mobile/kyc — Check KYC Status
 */
export function SectionMobileKycStatus() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">Check KYC Status</h1>
        <p className="text-slate-500 text-lg font-medium leading-relaxed">
          Returns the current KYC verification status for the authenticated user. Use this
          to poll for updates after the user completes the Didit flow.
        </p>
      </header>

      <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
        <Info className="w-6 h-6 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h5 className="font-bold text-amber-900">Polling Strategy</h5>
          <p className="text-sm text-amber-700 leading-relaxed">
            After the user completes the Didit flow, poll this endpoint every <strong>3 seconds</strong>{" "}
            for up to <strong>2 minutes</strong>. The webhook usually fires within 5-15 seconds.
            If still pending, show a &quot;still processing&quot; message and check again later.
          </p>
        </div>
      </div>

      <ApiEndpointDoc
        title="Get Verification Status"
        method="GET"
        url="/api/mobile/kyc"
        description="Returns the most recent KYC verification record for the authenticated user, including the current status, document type, and any verification notes."
        responseExample={`// User has KYC record
{
  "success": true,
  "data": {
    "status": {
      "id": "uuid-of-kyc-record",
      "user_id": "uuid-of-user",
      "document_type": "didit",
      "status": "approved",
      "verification_notes": "Automated Didit result: Approved",
      "full_name": "John Doe",
      "created_at": "2026-07-22T12:00:00Z",
      "updated_at": "2026-07-22T12:05:00Z"
    },
    "error": null
  }
}

// No KYC submitted
{
  "success": true,
  "data": {
    "status": null,
    "error": null
  }
}`}
      />
    </div>
  );
}

/**
 * GET /api/mobile/kyc/session/[sessionId] — Session Decision
 */
export function SectionMobileKycSession() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">Session Decision</h1>
        <p className="text-slate-500 text-lg font-medium leading-relaxed">
          Retrieves a specific Didit session&apos;s decision directly from Didit&apos;s API.
          Useful for getting the result immediately after the user finishes,
          before the webhook has fired.
        </p>
      </header>

      <ApiEndpointDoc
        title="Get Session Decision"
        method="GET"
        url="/api/mobile/kyc/session/{sessionId}"
        description="Retrieves the verification decision for a specific Didit session. The sessionId is the value returned when you created the session. Includes a security check to ensure the session belongs to the authenticated user."
        parameters={[
          {
            name: "sessionId",
            type: "string (path)",
            required: true,
            description:
              "The session_id returned from POST /api/mobile/kyc",
          },
        ]}
        responseExample={`// 200 OK
{
  "success": true,
  "data": {
    "session_id": "a1b2c3d4-e5f6-...",
    "status": "Approved",
    "created_at": "2026-07-22T12:00:00Z",
    "updated_at": "2026-07-22T12:05:00Z"
  }
}

// 403 Forbidden (wrong user)
{
  "success": false,
  "error": "Session does not belong to this user"
}

// 404 Not Found
{
  "success": false,
  "error": "Session not found"
}`}
      >
        <div className="space-y-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Didit Session Statuses
          </h4>
          <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-[13px] font-semibold text-gray-700">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { status: "In Progress", meaning: "User hasn't completed the flow yet" },
                  { status: "Approved", meaning: "Verification passed" },
                  { status: "Declined", meaning: "Verification failed" },
                  { status: "Review", meaning: "Under manual review by Didit" },
                ].map((row) => (
                  <tr key={row.status} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-blue-600 font-mono text-[13px] font-semibold">{row.status}</code>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-600">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ApiEndpointDoc>
    </div>
  );
}

/**
 * GET /api/mobile/kyc/legacy — Legacy KYC Data
 */
export function SectionMobileKycLegacy() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">Legacy KYC Data</h1>
        <p className="text-slate-500 text-lg font-medium leading-relaxed">
          Returns KYC verification data for users who completed verification through the
          old manual document upload flow (before the Didit integration).
        </p>
      </header>

      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4">
        <Info className="w-6 h-6 text-slate-500 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h5 className="font-bold text-slate-800">When to use this endpoint</h5>
          <p className="text-sm text-slate-600 leading-relaxed">
            Use this only for users who verified before the Didit integration.
            Legacy records have <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono">document_type</code> values
            like <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono">&quot;passport&quot;</code>,{" "}
            <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono">&quot;national_id&quot;</code>, etc.
            — NOT <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono">&quot;didit&quot;</code>.
            For new verifications, use <strong>POST /api/mobile/kyc</strong> to start a Didit session.
          </p>
        </div>
      </div>

      <ApiEndpointDoc
        title="Get Legacy Verification"
        method="GET"
        url="/api/mobile/kyc/legacy"
        description="Returns the most recent non-Didit KYC record for the authenticated user. Includes personal details that were submitted through the old manual upload form."
        responseExample={`// Legacy data exists
{
  "success": true,
  "data": {
    "has_legacy_kyc": true,
    "verification": {
      "id": "uuid",
      "status": "approved",
      "document_type": "passport",
      "full_name": "John Doe",
      "dob": "1990-01-15",
      "phone": "+234801234567",
      "address": "123 Main Street",
      "city": "Lagos",
      "state": "Lagos",
      "postal": "100001",
      "country": "Nigeria",
      "verification_notes": "Approved by admin",
      "created_at": "2026-03-15T10:00:00Z",
      "updated_at": "2026-03-16T14:30:00Z"
    }
  }
}

// No legacy data
{
  "success": true,
  "data": {
    "has_legacy_kyc": false,
    "verification": null
  }
}`}
      />
    </div>
  );
}
