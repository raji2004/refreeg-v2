"use client";

import React from "react";
import ApiEndpointDoc from "./ApiEndpointDoc";
import { Info, Banknote, Zap } from "lucide-react";

const campaignParameters = [
  {
    name: "title",
    type: "string",
    required: true,
    description: "Official name of the campaign. (5-100 characters)",
  },
  {
    name: "description",
    type: "string",
    required: true,
    description: "Detailed story/markdown of the campaign (20-5000 chars).",
  },
  {
    name: "goal_amount",
    type: "number",
    required: true,
    description: "Target amount in NGN.",
  },
  {
    name: "payout_mode",
    type: "string",
    required: true,
    description: "'manual' (on-demand) or 'automated' (at deadline).",
  },
  {
    name: "deadline",
    type: "string",
    required: false,
    description: "ISO 8601 string. **Required** if payout_mode is 'automated'.",
  },
  {
    name: "category_id",
    type: "string",
    required: false,
    description:
      "UUID from /campaigns/categories. Helps in discovery and search weighting.",
  },
  {
    name: "bank_id",
    type: "string",
    required: false,
    description:
      "UUID of a saved bank profile. Use this to skip providing direct bank details.",
  },
  {
    name: "bank_account_number",
    type: "string",
    required: false,
    description: "10-digit NUBAN. Required if bank_id is not provided.",
  },
  {
    name: "bank_code",
    type: "string",
    required: false,
    description:
      "3-digit code (e.g., '058'). Required if bank_id is not provided.",
  },
  {
    name: "bank_account_name",
    type: "string",
    required: false,
    description: "Legal name. Required if bank_id is not provided.",
  },
];

const updateParameters = campaignParameters.map((p) => ({
  ...p,
  required: false,
}));
updateParameters.push({
  name: "status",
  type: "string",
  required: false,
  description:
    "Manually set status: 'active', 'paused', 'completed', 'cancelled'.",
});

export function SectionCreateCampaign() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Create Campaign
        </h1>
        <p className="text-slate-500 text-lg">
          Initializes a new fundraising campaign with direct bank settlement.
        </p>
      </header>

      <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex flex-col gap-6">
        <h3 className="font-bold text-[#0A2A5C] flex items-center gap-2">
          <Banknote className="w-5 h-5 text-blue-600" />
          Flexible Settlement
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">
          You can provide bank details **directly** in the creation request, or
          use a pre-registered **bank_id** for better reuse and cleaner
          payloads. If direct details are used, we automatically save them to
          your profile.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-5 bg-white rounded-2xl border border-blue-100/50 space-y-2">
            <div className="flex items-center gap-2 text-blue-600 font-bold mb-2">
              <Zap className="w-4 h-4" /> manual
            </div>
            <p className="text-slate-600 leading-relaxed">
              Funds are pushed to your bank account as soon as donations are
              verified. Perfect for urgent needs.
            </p>
          </div>
          <div className="p-5 bg-white rounded-2xl border border-blue-100/50 space-y-2">
            <div className="flex items-center gap-2 font-bold mb-2 text-indigo-600">
              <Info className="w-4 h-4" /> automated
            </div>
            <p className="text-slate-600 leading-relaxed">
              Funds are held by RefreeG and settled in a single lump sum after
              the deadline.
            </p>
          </div>
        </div>
      </div>

      <ApiEndpointDoc
        title="Create Campaign"
        method="POST"
        url="/api/bot/campaigns"
        description="Creates a new campaign. API campaigns are immediately active."
        parameters={campaignParameters}
        requestExample={`{
  "title": "Hospital Recovery Fund",
  "bank_id": "ba_987...",
  "goal_amount": 250000,
  "payout_mode": "manual"
}`}
        responseExample={`{
  "status": "success",
  "data": { 
    "id": "uuid...", 
    "status": "active",
    "title": "Hospital Recovery Fund",
    "goal_amount": 250000,
    "payout_mode": "manual"
  }
}`}
      />
    </div>
  );
}

export function SectionRetrieveCampaign() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Retrieve Campaign
        </h1>
        <p className="text-slate-500 text-lg">
          Fetch the full details and current progress of a specific campaign.
        </p>
      </header>

      <ApiEndpointDoc
        title="Get Campaign"
        method="GET"
        url="/api/bot/campaigns/[id]"
        description="Returns a full campaign object including raised amounts and bank details."
        parameters={[]}
        responseExample={`{
  "status": "success",
  "data": {
    "id": "c8b3ecf6...",
    "title": "Clean Water",
    "raised_amount": 54000,
    "goal_amount": 100000,
    "status": "active"
  }
}`}
      />
    </div>
  );
}

export function SectionUpdateCampaign() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Update Campaign
        </h1>
        <p className="text-slate-500 text-lg">
          Modifies an existing campaign. Only specified fields will be updated.
        </p>
      </header>

      <ApiEndpointDoc
        title="Update Campaign"
        method="PATCH"
        url="/api/bot/campaigns/[id]"
        description="Updates campaign details. Supports title, description, bank details, and status updates."
        parameters={updateParameters}
        requestExample={`{ "status": "paused" }`}
        responseExample={`{ 
  "status": "success", 
  "data": { 
    "id": "uuid...", 
    "status": "paused",
    "updated_at": "2026-04-02T12:00:00Z"
  } 
}`}
      />
    </div>
  );
}

export function SectionListCampaigns() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          List Campaigns
        </h1>
        <p className="text-slate-500 text-lg">
          Retrieves a paginated list of all campaigns owned by your API key.
        </p>
      </header>

      <ApiEndpointDoc
        title="List Campaigns"
        method="GET"
        url="/api/bot/campaigns"
        description="Filter campaigns by status or category."
        parameters={[
          {
            name: "status",
            type: "string",
            required: false,
            description: "Filter by status.",
          },
          {
            name: "category",
            type: "string",
            required: false,
            description: "Filter by category ID.",
          },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Max results (10-100).",
          },
          {
            name: "offset",
            type: "number",
            required: false,
            description: "Pagination offset.",
          },
        ]}
        responseExample={`{ 
  "status": "success", 
  "data": [
    {
      "id": "uuid-1",
      "title": "Climate Relief",
      "status": "active",
      "raised_amount": 120000,
      "goal_amount": 500000
    }
  ], 
  "meta": { 
    "total": 1,
    "limit": 10,
    "offset": 0
  } 
}`}
      />
    </div>
  );
}

export function SectionBanks() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">Banks API</h1>
        <p className="text-slate-500 text-lg">
          Register and manage settlement bank accounts separately from
          campaigns.
        </p>
      </header>

      <ApiEndpointDoc
        title="Register Bank Account"
        method="POST"
        url="/api/bot/banks"
        description="Saves a bank account profile for future reuse in campaign settlement."
        parameters={[
          {
            name: "bank_account_number",
            type: "string",
            required: true,
            description: "10-digit NUBAN.",
          },
          {
            name: "bank_code",
            type: "string",
            required: true,
            description: "3-digit bank code.",
          },
          {
            name: "bank_account_name",
            type: "string",
            required: true,
            description: "Legal account name.",
          },
        ]}
        requestExample={`{
  "bank_account_number": "0022334455",
  "bank_code": "058",
  "bank_account_name": "Dev Account"
}`}
        responseExample={`{
  "status": "success",
  "data": { "id": "ba_987...", "bank_account_name": "Dev Account" }
}`}
      />

      <ApiEndpointDoc
        title="List Bank Accounts"
        method="GET"
        url="/api/bot/banks"
        description="Fetches all registered bank profiles for your account."
        parameters={[]}
        responseExample={`{ 
  "status": "success", 
  "data": [
    { 
      "id": "ba_987...", 
      "bank_account_name": "Dev Account",
      "bank_account_number": "0022334455",
      "bank_code": "058"
    }
  ] 
}`}
      />
    </div>
  );
}

export function SectionListCampaignDonations() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          List Campaign Donations
        </h1>
        <p className="text-slate-500 text-lg">
          Retrieve all donations associated with a specific campaign.
        </p>
      </header>

      <ApiEndpointDoc
        title="List Campaign Donations"
        method="GET"
        url="/api/bot/campaigns/[id]/donations"
        description="Returns a list of successful donations for the campaign."
        parameters={[]}
        responseExample={`{
  "status": "success",
  "data": [
    {
      "id": "don_...",
      "amount": 5000,
      "status": "success",
      "donor_name": "Anonymous"
    }
  ]
}`}
      />
    </div>
  );
}

export function SectionPauseResumeCampaign() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Pause/Resume Campaign
        </h1>
        <p className="text-slate-500 text-lg">
          Temporarily pause or resume accepting donations for a campaign.
        </p>
      </header>

      <ApiEndpointDoc
        title="Pause Campaign"
        method="POST"
        url="/api/bot/campaigns/[id]/pause"
        description="Transitions a campaign to paused state, halting new donations."
        parameters={[]}
        responseExample={`{ 
  "status": "success", 
  "data": { 
    "id": "uuid...", 
    "status": "paused",
    "paused_at": "2026-04-02T12:00:00Z"
  } 
}`}
      />

      <ApiEndpointDoc
        title="Resume Campaign"
        method="POST"
        url="/api/bot/campaigns/[id]/resume"
        description="Resumes a paused campaign, making it active again."
        parameters={[]}
        responseExample={`{ 
  "status": "success", 
  "data": { 
    "id": "uuid...", 
    "status": "active",
    "resumed_at": "2026-04-02T12:00:00Z"
  } 
}`}
      />
    </div>
  );
}

export function SectionCancelCampaign() {
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Cancel Campaign
        </h1>
        <p className="text-slate-500 text-lg">
          Permanently cancel a campaign, changing its status to cancelled.
        </p>
      </header>

      <ApiEndpointDoc
        title="Cancel Campaign"
        method="DELETE"
        url="/api/bot/campaigns/[id]"
        description="Cancels the campaign. This action cannot be undone."
        parameters={[]}
        responseExample={`{ "status": "success", "message": "Campaign deleted" }`}
      />
    </div>
  );
}
