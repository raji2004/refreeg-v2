"use client";

import React from "react";
import ApiEndpointDoc from "./ApiEndpointDoc";
import { Info } from "lucide-react";

export function SectionDonations() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl font-extrabold text-slate-900">
            Process Donations
          </h1>
          <p className="text-slate-500 text-lg font-medium leading-relaxed">
            Securely accept payments for any campaign via our integrated payment
            gateways.
          </p>
        </header>

        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
          <Info className="w-6 h-6 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h5 className="font-bold text-amber-900">Test Mode Behavior</h5>
            <p className="text-sm text-amber-700 leading-relaxed">
              When using a <strong>test API key</strong> (
              <code className="text-xs bg-amber-100 px-1 rounded">
                rg_test_sk_*
              </code>
              ), donations are <strong>processed instantly</strong> without
              creating a real Paystack checkout. The response will have{" "}
              <code className="text-xs bg-amber-100 px-1 rounded">
                checkout_url: null
              </code>{" "}
              and
              <code className="text-xs bg-amber-100 px-1 rounded">
                mode: &quot;test&quot;
              </code>
              . Webhooks are still dispatched.
            </p>
          </div>
        </div>

        <ApiEndpointDoc
          title="Initialize Donation"
          method="POST"
          url="/api/bot/donations/initialize"
          description="Initiates a donation process. Returns a secure checkout URL for the donor (live mode) or simulates the donation instantly (test mode)."
          parameters={[
            {
              name: "campaign_id",
              type: "uuid",
              required: true,
              description: "ID of the target campaign.",
            },
            {
              name: "amount",
              type: "number",
              required: true,
              description: "Donation amount in NGN.",
            },
            {
              name: "name",
              type: "string",
              required: true,
              description: "Donor display name.",
            },
            {
              name: "email",
              type: "string",
              required: true,
              description: "Donor email address.",
            },
            {
              name: "tip_amount",
              type: "number",
              required: false,
              description: "Optional platform tip in NGN.",
            },
            {
              name: "message",
              type: "string",
              required: false,
              description: "Personal message (optional).",
            },
            {
              name: "is_anonymous",
              type: "boolean",
              required: false,
              description: "Whether to hide donor name publicly.",
            },
            {
              name: "callback_url",
              type: "string",
              required: false,
              description:
                "Where to redirect the user after payment (live mode only).",
            },
          ]}
          requestExample={`{
  "campaign_id": "c8b3ecf6-02e1-450f...",
  "amount": 10000,
  "name": "Alex Johnson",
  "email": "alex@example.com",
  "callback_url": "https://myapp.com/success"
}`}
          responseExample={`// Live mode:
{
  "status": "success",
  "data": {
    "reference": "ref_don_123...",
    "checkout_url": "https://paystack.com/checkout/f4g5...",
    "amount": 10000
  }
}

// Test mode:
{
  "status": "success",
  "data": {
    "reference": "test_ref_a1b2c3d4e5f67890",
    "checkout_url": null,
    "amount": 10000,
    "mode": "test",
    "message": "Test donation processed instantly — no real payment was made.",
    "donation_id": "uuid..."
  }
}`}
        />

        <ApiEndpointDoc
          title="Verify Donation"
          method="GET"
          url="/api/bot/donations/verify/[reference]"
          description="Verifies the outcome of a donation attempt using the unique transaction reference. For test references (starting with test_ref_), retrieves the pre-recorded test donation."
          responseExample={`{
  "status": "success",
  "data": {
    "id": "don_987...",
    "status": "success",
    "amount": 10000,
    "currency": "NGN",
    "reference": "test_ref_a1b2c3d4e5f67890",
    "mode": "test",
    "created_at": "2026-03-25T11:00:00Z",
    "campaign": { "id": "uuid", "title": "..." },
    "donor": { "name": "...", "email": "..." }
  }
}`}
        />
      </div>
    </div>
  );
}

export function SectionRetrieveDonation() {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Retrieve Donation
        </h1>
        <p className="text-slate-500 text-lg">
          Retrieve detailed information about a single donation by its ID.
        </p>
      </header>

      <ApiEndpointDoc
        title="Get Donation"
        method="GET"
        url="/api/bot/donations/[id]"
        description="Returns a full donation object."
        parameters={[]}
        responseExample={`{
  "status": "success",
  "data": {
    "id": "uuid...",
    "reference": "ref_...",
    "amount": 10000,
    "donor_name": "Alex",
    "status": "success",
    "mode": "test"
  }
}`}
      />
    </div>
  );
}
