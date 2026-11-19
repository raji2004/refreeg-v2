# RefreeG Crowdfunding Infrastructure API: Technical Design Document (TDD)

> **Version:** 1.0
> **Date:** March 24, 2026
> **Status:** Draft
> **Based on:** [AI-BOT-PRD.md](./AI-BOT-PRD.md)
> **Stack:** Next.js (App Router) · Supabase (PostgreSQL + Auth + Storage) · Paystack (Payment Gateway)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Authentication & API Keys](#3-authentication--api-keys)
4. [Correct Data Schemas (from codebase)](#4-correct-data-schemas-from-codebase)
5. [API Endpoints](#5-api-endpoints)
6. [Webhook System](#6-webhook-system)
7. [AI Integration Layer](#7-ai-integration-layer)
8. [Security & Rate Limiting](#8-security--rate-limiting)
9. [Developer Documentation Site](#9-developer-documentation-site)
10. [Step-by-Step Implementation Tasks](#10-step-by-step-implementation-tasks)

---

## 1. Overview

RefreeG is a **Crowdfunding-as-a-Service (CaaS)** platform. This TDD defines the public REST API that enables external developers to integrate crowdfunding features into their own applications: similar to how Paystack exposes payment APIs.

### Design Philosophy: Open & Frictionless

> [!IMPORTANT]
> **The RefreeG API is fundamentally different from the RefreeG platform website.**
>
> On the platform itself, campaigns require KYC verification, admin approval, and identity checks.
> **The API does NOT enforce any of these rules.** Campaigns created via API go **live immediately**: no pending state, no admin review, no KYC gate.
>
> Developers using the API have **full freedom** to add their own validation, moderation, and trust mechanisms on their side. RefreeG simply provides the crowdfunding infrastructure: campaign storage, payment processing, and payout distribution.
>
> Think of it like **Paystack**: Paystack doesn't verify what you're selling. It just processes payments. RefreeG doesn't gatekeep campaigns. It just enables crowdfunding.

### Key Business Rules

| Rule                       | Detail                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No end-user auth**       | RefreeG does NOT authenticate the end-user/donor. Developers handle auth on their platform. The API only authenticates the _developer_ via API key.   |
| **Campaigns are isolated** | API campaigns do **NOT** appear on the refreeg.com website. They live only on the developer's platform. RefreeG can view them in the admin dashboard. |
| **Developers are admins**  | Developers have full control over their campaigns: create, update, pause, cancel. No RefreeG admin approval needed.                                   |
| **Platform fee**           | Fixed **2% fee** on every donation, deducted automatically via Paystack split payment. Non-negotiable.                                                |
| **Payout options**         | Developers choose: **immediate** (funds go straight to beneficiary) or **after campaign deadline**. Configurable per campaign.                        |
| **Email receipts**         | RefreeG sends **payment receipts** to donors automatically after successful donation. This is mandatory.                                              |
| **No other notifications** | RefreeG does NOT send campaign updates or marketing emails. Devs add their own SMTP provider. We provide a blueprint.                                 |
| **Campaign reporting**     | Users can report campaigns. Reports go to RefreeG. If investigated and confirmed, RefreeG can take the campaign down.                                 |
| **Anonymous donations**    | Allowed. Donor can choose to be anonymous. Messages on donations are also supported.                                                                  |
| **Campaign deadlines**     | Campaigns can have deadlines. They may auto-complete when the deadline passes or when the goal is reached.                                            |

### Core Capabilities Exposed via API

| Capability                | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| **Campaign Management**   | Create, read, update, pause, cancel campaigns                            |
| **Donation Processing**   | Initiate donations, verify payments, send receipts                       |
| **Payout Infrastructure** | Fund distribution via Paystack sub-accounts (immediate or post-deadline) |
| **Campaign Reporting**    | Report suspicious campaigns to RefreeG for review                        |
| **Campaign Validation**   | Validate AI-generated campaign data against schema (optional)            |
| **Webhooks**              | Real-time event notifications to developer platforms                     |

---

## 2. Architecture

```
┌───────────────────────────────────────────┐
│          Third-Party Developer App        │
│  (uses RefreeG API keys to make requests) │
└──────────────────┬────────────────────────┘
                   │  HTTPS (REST API)
                   ▼
┌───────────────────────────────────────────┐
│        RefreeG API Gateway (Next.js)      │
│  /api/v1/*                                │
│  ┌─────────────┐  ┌───────────────────┐   │
│  │ Auth Guard  │  │  Rate Limiter     │   │
│  │ (API Key)   │  │  (per-key limits) │   │
│  └─────────────┘  └───────────────────┘   │
│  ┌────────────────────────────────────┐   │
│  │  Route Handlers                    │   │
│  │  • campaigns/*                     │   │
│  │  • donations/*                     │   │
│  │  • webhooks/*                      │   │
│  │  • validate/*                      │   │
│  └────────────────────────────────────┘   │
└──────────────────┬────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
  ┌──────────┐ ┌────────┐ ┌──────────┐
  │ Supabase │ │Paystack│ │ Supabase │
  │ Database │ │  API   │ │ Storage  │
  └──────────┘ └────────┘ └──────────┘
```

**All API routes live under:** `app/api/v1/`

---

## 3. Authentication & API Keys

### 3.1 API Key Model

Developers authenticate using API keys issued from their RefreeG Developer Dashboard.

**New database table: `api_keys`**

```sql
CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  key_hash      TEXT NOT NULL UNIQUE,        -- SHA-256 hash of the actual key
  key_prefix    VARCHAR(12) NOT NULL,        -- First 8 chars for display (e.g. "rg_live_3x...")
  name          TEXT NOT NULL,               -- Developer-provided label
  environment   VARCHAR(10) NOT NULL DEFAULT 'test', -- 'test' | 'live'
  permissions   JSONB DEFAULT '["campaigns:read","campaigns:write","donations:read","donations:write"]',
  rate_limit    INTEGER DEFAULT 100,         -- Requests per minute
  last_used_at  TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Key Format

| Environment | Format                       | Example                              |
| ----------- | ---------------------------- | ------------------------------------ |
| Test        | `rg_test_` + 40 random chars | `rg_test_sk_a1b2c3d4e5f6g7h8i9j0...` |
| Live        | `rg_live_` + 40 random chars | `rg_live_sk_z9y8x7w6v5u4t3s2r1q0...` |

### 3.3 Authentication Header

```
Authorization: Bearer rg_live_sk_a1b2c3d4e5f6g7h8i9...
```

### 3.4 Key Generation Flow

1. Developer signs up on RefreeG → creates account (email + password only)
2. Navigates to Developer Dashboard → API Keys section
3. Generates Test key (sandbox) and Live key (production)
4. Keys are shown ONCE, then only the prefix is stored

> [!NOTE]
> **No KYC required for API access.** Unlike the RefreeG platform (which requires KYC to create causes), API access is open. Developers sign up, get keys, and start building immediately.

---

## 4. Correct Data Schemas (from codebase)

> **IMPORTANT:** The PRD contained several schema inaccuracies. The schemas below are sourced directly from the codebase type definitions and database types.

### 4.1 Campaign (Cause) Schema

**Source:** `types/cause-types.ts`, `types/database-types.ts`

```typescript
// Full Campaign object (what the API returns)
interface Campaign {
  id: string; // UUID, auto-generated
  api_key_id: string; // UUID: which developer owns this campaign
  title: string; // Required
  description: string; // Required
  category: string; // Required: see Category Enum below
  goal: number; // Required: fundraising target amount
  raised: number; // Read-only, auto-calculated from donations
  status: "active" | "completed" | "paused" | "cancelled"; // See note below
  payout_mode: "immediate" | "after_deadline"; // When funds are released
  currency: string; // "NGN" (default)
  deadline: string | null; // ISO date: campaign end date (optional)
  created_at: string; // ISO timestamp, auto-set
  updated_at: string; // ISO timestamp, auto-set
  image: string | null; // Cover image URL
  multimedia: string[]; // Additional image/video URLs
  video_links: string[]; // External video URLs (YouTube, etc.)
  sections: {
    // Structured story sections
    heading: string;
    description: string;
  }[];
  summary: string | null; // Short description
  location: string | null; // Campaign location
  faqs:
    | {
        // Optional FAQ section
        question: string;
        answer: string;
      }[]
    | null;
  source: "api"; // Always "api": distinguishes from platform campaigns
  bank_account: {
    // Beneficiary bank details for payouts
    account_number: string;
    bank_code: string;
    account_name: string;
  };
}
// NOTE: API campaigns use a DIFFERENT status lifecycle than platform campaigns.
// Platform uses: "pending" → admin approval → "approved" / "rejected"
// API uses: "active" (immediate) → "completed" / "paused" / "cancelled"
// No admin approval, no pending state. Campaigns go live instantly.
//
// API campaigns NEVER appear on refreeg.com. They only exist on the
// developer's platform. RefreeG admins can view them in the admin dashboard.
```

**Category Enum (from `lib/categories.ts`):**

| ID            | Display Name    |
| ------------- | --------------- |
| `education`   | Education       |
| `health`      | Healthcare      |
| `environment` | Environment     |
| `community`   | Community       |
| `disaster`    | Disaster Relief |
| `animals`     | Animal Welfare  |
| `creative`    | Creative        |
| `business`    | Business        |

### 4.2 Campaign Create Payload (Developer-Submitted)

**Source:** `types/cause-types.ts` → `CauseFormData`

```typescript
// What developers send to POST /api/v1/campaigns
interface CampaignCreatePayload {
  title: string; // Required
  description?: string; // Optional (can be generated later)
  category: string; // Required: must be a valid category ID
  goal: number; // Required: positive number
  currency?: string; // Optional (defaults to "NGN")
  payout_mode?: "immediate" | "after_deadline"; // Optional (defaults to "after_deadline")
  deadline?: string; // Optional: ISO date for campaign end
  summary?: string; // Optional: short description
  location?: string; // Optional: campaign location
  sections?: {
    // Optional: structured story sections
    heading: string;
    description: string;
  }[];
  multimedia?: string[]; // Optional: pre-uploaded media URLs
  video_links?: string[]; // Optional: external video links
  cover_image_url?: string; // Optional: URL to cover image
  faqs?: {
    // Optional: campaign FAQs
    question: string;
    answer: string;
  }[];
  bank_account: {
    // Required: beneficiary bank details (developer-verified)
    account_number: string; // 10-digit NUBAN account number
    bank_code: string; // Paystack bank code (developer provides this)
    account_name: string; // Account holder name
  };
}
```

**Payout Modes:**

- `"immediate"`: Donations go directly to the beneficiary's bank account after each successful payment (minus 2% platform fee)
- `"after_deadline"`: Funds are held until the campaign deadline passes, then released in one payout (minus 2% platform fee)

**Fields NOT accepted (managed internally):**

- `id`, `api_key_id`, `raised`, `status`, `source`
- `created_at`, `updated_at`

### 4.3 Donation Schema

**Source:** `types/donation-types.ts`, `types/database-types.ts`

```typescript
// Full Donation object (what the API returns)
interface Donation {
  id: string; // UUID, auto-generated
  cause_id: string; // UUID: the campaign receiving the donation
  user_id: string | null; // UUID, nullable (anonymous guest donors)
  amount: number; // Donation amount (NOTE: PRD called this "donation_amount")
  name: string; // Donor name (NOTE: PRD called this "donor_name")
  email: string; // Donor email (NOTE: PRD called this "donor_email")
  message: string | null; // Optional donor message (MISSING from PRD)
  is_anonymous: boolean; // Whether donor is anonymous (MISSING from PRD)
  status: "pending" | "completed" | "failed"; // Payment status
  receipt_url: string | null; // Payment receipt URL
  tip_amount: number; // Platform tip from donor (MISSING from PRD)
  created_at: string; // ISO timestamp
}
```

### 4.4 Donation Create Payload (Developer-Submitted)

**Source:** `types/common-types.ts` → `DonationFormData`

```typescript
// What developers send to POST /api/v1/donations
interface DonationCreatePayload {
  campaign_id: string; // Required: UUID of the target campaign
  amount: number; // Required: donation amount
  name: string; // Required: donor display name
  email: string; // Required: donor email
  message?: string; // Optional: donor message
  is_anonymous?: boolean; // Optional: defaults to false
  tip_amount?: number; // Optional: platform tip, defaults to 0
  callback_url?: string; // Optional: redirect after payment
}
```

**Fields NOT accepted (managed internally):**

- `id`, `user_id`, `status`, `receipt_url`, `created_at`

### 4.5 Paystack Transaction Data

**Source:** `types/common-types.ts` → `TransactionData`, `services/paystack.ts`

```typescript
// Internal structure used when initializing Paystack payment
interface TransactionData {
  email: string;
  full_name: string;
  id: string; // User ID
  amount: number; // Donation amount
  serviceFee: number; // Platform fee
  tipAmount?: number; // Optional donor tip
  causeId: string; // Campaign UUID
  message: string;
  isAnonymous: boolean;
  plan?: string; // For recurring donations
  subaccounts: {
    // Paystack split-payment sub-accounts
    subaccount: string; // Sub-account code
    share: number; // Share percentage
  }[];
}
```

### 4.6 Profile Schema (Campaign Creator)

**Source:** `types/profile-types.ts`

```typescript
interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  phone: string | null;
  location?: string | null;
  account_number: string | null;
  bank_name: string | null;
  account_name: string | null;
  sub_account_code: string | null; // Paystack sub-account for payouts
  profile_photo: string | null;
  is_blocked: boolean;
  account_type?:
    "individual" | "creator" | "non-profit" | "organization" | "community";
  bio: string | null;
  is_verified?: boolean;
  // ... additional fields
}
```

### 4.7 API vs Platform: Key Differences

> [!IMPORTANT]
> The schemas above reflect the **API context**, which is different from the platform.

| Aspect                  | RefreeG Platform                           | RefreeG API                                            |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------ |
| **End-User Auth**       | Users sign up, verify email                | **No auth.** Dev handles auth on their side            |
| **KYC**                 | Required before creating campaigns         | Not required                                           |
| **Admin Approval**      | Campaigns start as "pending"               | Campaigns go **"active" immediately**                  |
| **Campaign Visibility** | Visible on refreeg.com                     | **NEVER visible on refreeg.com**                       |
| **Campaign Moderation** | RefreeG team moderates                     | Developer's responsibility                             |
| **Notifications**       | RefreeG sends campaign updates, milestones | **Only payment receipts.** Dev handles the rest        |
| **Payouts**             | After admin approval                       | Developer chooses: **immediate** or **after deadline** |
| **Platform Fee**        | 2% (via Paystack split)                    | Same: **2% fixed**                                     |
| **Reporting**           | Users report on platform                   | Users can report via API → RefreeG reviews             |

The API stores campaigns in a separate `api_campaigns` table (NOT the `causes` table). This ensures complete isolation: API campaigns never appear on the main site. RefreeG admins can monitor API campaigns through the admin dashboard.

### 4.8 Platform Fee Structure

RefreeG charges a **flat 2% platform fee** on every donation transaction. Implemented via Paystack's split payment mechanism.

```
Donor pays ₦10,000
├── ₦9,800 → Beneficiary bank account (via Paystack sub-account)
└── ₦200   → RefreeG platform (2% fee)
```

The fee is non-negotiable and automatically deducted. Developers do not need to calculate or handle this.

### 4.9 Webhook Event Schema (New)

```typescript
interface WebhookEvent {
  id: string; // Event UUID
  event_type: string; // e.g. "campaign.created", "donation.completed"
  api_key_id: string; // Which API key owns this event
  data: Record<string, any>; // Event payload
  created_at: string; // ISO timestamp
}

// Events that trigger webhooks:
type WebhookEventType =
  | "campaign.created" // Campaign was created (immediately active)
  | "campaign.updated" // Campaign details were updated
  | "campaign.completed" // Campaign reached its goal or deadline passed
  | "campaign.paused" // Campaign was paused by developer
  | "campaign.cancelled" // Campaign was cancelled
  | "campaign.reported" // Campaign was reported (sent to RefreeG admin)
  | "campaign.taken_down" // Campaign was taken down by RefreeG after investigation
  | "donation.initiated" // Donation payment started
  | "donation.completed" // Donation payment confirmed + receipt sent
  | "donation.failed" // Donation payment failed
  | "payout.processed" // Payout sent to beneficiary
  | "payout.failed"; // Payout failed
```

---

## 5. API Endpoints

### 5.1 Base URL

```
Production:  https://api.refreeg.com/api/v1
Test:        https://sandbox.refreeg.com/api/v1
```

### 5.2 Campaign Endpoints

| Method   | Endpoint                   | Description                                   | Auth    |
| -------- | -------------------------- | --------------------------------------------- | ------- |
| `POST`   | `/campaigns`               | Create a new campaign (goes live immediately) | API Key |
| `GET`    | `/campaigns`               | List campaigns (with filters)                 | API Key |
| `GET`    | `/campaigns/:id`           | Get campaign details + progress               | API Key |
| `PATCH`  | `/campaigns/:id`           | Update a campaign                             | API Key |
| `DELETE` | `/campaigns/:id`           | Cancel/delete a campaign                      | API Key |
| `POST`   | `/campaigns/:id/pause`     | Pause a campaign                              | API Key |
| `POST`   | `/campaigns/:id/resume`    | Resume a paused campaign                      | API Key |
| `GET`    | `/campaigns/:id/donations` | List donations for a campaign                 | API Key |
| `GET`    | `/campaigns/categories`    | List valid categories                         | API Key |
| `POST`   | `/campaigns/validate`      | Validate campaign data (for AI output)        | API Key |
| `POST`   | `/campaigns/:id/reports`   | Report a campaign to RefreeG                  | API Key |

> [!NOTE]
> **No `/banks` endpoint.** Developers are responsible for verifying bank account details on their side before submitting to the API. The `bank_account` fields are validated via Zod schemas (account_number must be 10 digits, bank_code and account_name are required strings).

#### POST /campaigns: Create Campaign

**Request:**

```json
{
  "title": "Help My Mother's Surgery",
  "description": "My mother was recently diagnosed...",
  "category": "health",
  "goal": 500000,
  "currency": "NGN",
  "payout_mode": "after_deadline",
  "deadline": "2026-06-25",
  "summary": "Urgent medical support needed",
  "location": "Lagos, Nigeria",
  "bank_account": {
    "account_number": "0123456789",
    "bank_code": "058",
    "account_name": "Jane Doe"
  },
  "sections": [
    {
      "heading": "Background",
      "description": "Our family recently faced..."
    },
    {
      "heading": "Why We Need Help",
      "description": "The surgery costs ₦500,000..."
    }
  ],
  "video_links": ["https://youtube.com/watch?v=abc123"]
}
```

**Response (201):**

```json
{
  "status": "success",
  "data": {
    "id": "uuid-campaign-id",
    "title": "Help My Mother's Surgery",
    "status": "active",
    "payout_mode": "after_deadline",
    "goal": 500000,
    "raised": 0,
    "category": "health",
    "deadline": "2026-06-25",
    "created_at": "2026-03-25T10:00:00Z",
    "...": "full campaign object"
  }
}
```

> Campaign is **immediately active** and can start receiving donations. No approval queue.
> Bank account is verified via Paystack during creation.

#### POST /campaigns/:id/reports: Report a Campaign

**Request:**

```json
{
  "reason": "fraud",
  "message": "This campaign appears to be a scam."
}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "report_id": "uuid-report-id",
    "message": "Report submitted. RefreeG will review this campaign."
  }
}
```

> Reports are sent to RefreeG's admin dashboard for investigation. If confirmed, RefreeG can take the campaign down.

#### GET /campaigns: List Campaigns

**Query Parameters:**

| Parameter  | Type   | Description                                                     |
| ---------- | ------ | --------------------------------------------------------------- |
| `category` | string | Filter by category ID                                           |
| `status`   | string | Filter by status (`active`, `completed`, `paused`, `cancelled`) |
| `limit`    | number | Max results (default: 10, max: 100)                             |
| `offset`   | number | Pagination offset                                               |

### 5.3 Donation Endpoints

| Method | Endpoint                       | Description                                        | Auth    |
| ------ | ------------------------------ | -------------------------------------------------- | ------- |
| `POST` | `/donations/initialize`        | Initiate a donation (returns Paystack payment URL) | API Key |
| `GET`  | `/donations/verify/:reference` | Verify a donation payment                          | API Key |
| `GET`  | `/donations/:id`               | Get donation details                               | API Key |

#### POST /donations/initialize: Initiate Donation

**Request:**

```json
{
  "campaign_id": "uuid-campaign-id",
  "amount": 5000,
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Stay strong!",
  "is_anonymous": false,
  "tip_amount": 500,
  "callback_url": "https://yourapp.com/donation/callback"
}
```

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "authorization_url": "https://checkout.paystack.com/abc123",
    "reference": "ref_xyz789",
    "access_code": "ac_abc123"
  }
}
```

#### GET /donations/verify/:reference: Verify Payment

**Response (200):**

```json
{
  "status": "success",
  "data": {
    "verified": true,
    "donation": {
      "id": "uuid-donation-id",
      "amount": 5000,
      "status": "completed",
      "campaign_id": "uuid-campaign-id",
      "created_at": "2026-03-25T12:00:00Z"
    }
  }
}
```

### 5.4 Webhook Endpoints

| Method   | Endpoint             | Description              | Auth    |
| -------- | -------------------- | ------------------------ | ------- |
| `POST`   | `/webhooks/register` | Register a webhook URL   | API Key |
| `GET`    | `/webhooks`          | List registered webhooks | API Key |
| `DELETE` | `/webhooks/:id`      | Delete a webhook         | API Key |

### 5.5 Developer Account Endpoints

| Method   | Endpoint             | Description                            | Auth    |
| -------- | -------------------- | -------------------------------------- | ------- |
| `POST`   | `/auth/register`     | Register for developer access          | Public  |
| `POST`   | `/auth/api-keys`     | Generate new API key                   | Session |
| `GET`    | `/auth/api-keys`     | List API keys (prefix + metadata only) | Session |
| `DELETE` | `/auth/api-keys/:id` | Revoke an API key                      | Session |

### 5.6 Authentication Model

> [!IMPORTANT]
> **No end-user authentication is required by the API.**
>
> The API authenticates the **developer** (via API key), not the donor or campaign creator.
> Developers are responsible for authenticating their own users on their platform.
>
> When a donation is made, the donor's `name` and `email` are passed in the request body -
> not verified against any RefreeG user account. This makes the API accessible to any platform
> without requiring users to create RefreeG accounts.

### 5.7 Payment Receipts

After a successful donation, RefreeG **automatically sends a payment receipt** to the donor's email:

- Donation amount
- Campaign title
- Transaction reference
- Date/time
- RefreeG receipt URL

Developers do NOT need to handle this: it's built into the donation verification flow.

### 5.8 Notification Blueprint (for Developers)

RefreeG only sends payment receipts. For other notifications (campaign updates, milestones, marketing), developers integrate their own email provider.

The docs will include a **"Notifications Blueprint"** guide showing developers how to:

1. Subscribe to RefreeG webhooks (`donation.completed`, `campaign.completed`, etc.)
2. Connect their own SMTP provider (SendGrid, Resend, AWS SES, etc.)
3. Send custom emails triggered by webhook events

Example flow:

```
Webhook: donation.completed → Dev server → Send "Thank you" email via SendGrid
Webhook: campaign.completed → Dev server → Send "Goal reached!" email to creator
```

---

## 6. Webhook System

### 6.1 Webhook Delivery

```
RefreeG Event → Queue → POST to developer webhook URL
                       Headers:
                         X-RefreeG-Signature: sha256=<hmac_signature>
                         X-RefreeG-Event: campaign.approved
                         Content-Type: application/json
```

### 6.2 Webhook Payload Format

```json
{
  "id": "evt_uuid",
  "event": "donation.completed",
  "created_at": "2026-03-25T12:00:00Z",
  "data": {
    "donation": {
      "id": "uuid",
      "amount": 5000,
      "campaign_id": "uuid",
      "status": "completed"
    }
  }
}
```

### 6.3 Webhook Verification

Developers verify webhook authenticity by computing HMAC-SHA256 of the raw body using their webhook secret:

```javascript
const crypto = require("crypto");
const signature = crypto
  .createHmac("sha256", webhookSecret)
  .update(rawBody)
  .digest("hex");
const isValid = `sha256=${signature}` === req.headers["x-refreeg-signature"];
```

### 6.4 New Database Table: `webhooks`

```sql
CREATE TABLE webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id  UUID NOT NULL REFERENCES api_keys(id),
  url         TEXT NOT NULL,
  secret      TEXT NOT NULL,         -- HMAC signing secret
  events      TEXT[] NOT NULL,       -- Array of event types subscribed to
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. AI Integration Layer

RefreeG does **not** host AI. Instead, it provides:

### 7.1 Campaign Schema for AI Prompts

Developers feed this schema to their AI provider to generate structured output:

```json
{
  "schema": {
    "title": { "type": "string", "required": true, "maxLength": 200 },
    "description": { "type": "string", "required": false },
    "summary": { "type": "string", "required": false, "maxLength": 500 },
    "category": {
      "type": "string",
      "required": true,
      "enum": [
        "education",
        "health",
        "environment",
        "community",
        "disaster",
        "animals",
        "creative",
        "business"
      ]
    },
    "goal": { "type": "number", "required": true, "min": 1000 },
    "sections": {
      "type": "array",
      "items": {
        "heading": { "type": "string", "required": true },
        "description": { "type": "string", "required": true }
      }
    },
    "location": { "type": "string", "required": false }
  }
}
```

### 7.2 Validation Endpoint

`POST /api/v1/campaigns/validate`: Validates AI-generated output against the schema before submission. Returns validation errors if any fields are invalid.

---

## 8. Security & Rate Limiting

### 8.1 Rate Limits

| Plan       | Requests/min | Campaigns/month | Donations/month |
| ---------- | ------------ | --------------- | --------------- |
| Free       | 60           | 10              | 100             |
| Starter    | 200          | 100             | 5,000           |
| Growth     | 1,000        | Unlimited       | 50,000          |
| Enterprise | Custom       | Unlimited       | Unlimited       |

### 8.2 Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 1711375200
```

### 8.3 Security Measures

- API keys are hashed (SHA-256) before storage
- All endpoints enforce HTTPS
- Request body validation using Zod schemas
- CORS configuration for allowed origins
- IP allowlisting (optional, Enterprise plan)
- Webhook signatures for payload integrity

---

## 9. Developer Documentation Site

### 9.1 Documentation Structure

Build a dedicated docs site at `/docs` (or `docs.refreeg.com`) using the existing Next.js app.

**Pages:**

```
/docs
├── /getting-started          # Overview + quickstart
│   ├── /introduction         # What is RefreeG API
│   ├── /quickstart           # 5-minute integration guide
│   └── /authentication       # API key setup
├── /guides
│   ├── /create-campaign      # Step-by-step campaign creation
│   ├── /accept-donations     # Donation flow integration
│   ├── /payout-options       # Immediate vs. after-deadline payouts
│   ├── /webhooks             # Setting up webhooks
│   ├── /notifications        # SMTP blueprint for developer notifications
│   ├── /campaign-reporting   # How reporting works
│   ├── /ai-integration       # Using AI with RefreeG schema
│   └── /testing              # Using sandbox/test mode
├── /api-reference
│   ├── /campaigns            # Campaign CRUD endpoints
│   ├── /donations            # Donation endpoints
│   ├── /webhooks             # Webhook management endpoints
│   └── /errors               # Error codes reference
├── /sdks
│   ├── /javascript           # JS/Node SDK (npm package)
│   ├── /python               # Python SDK (pip package)
│   └── /rest                 # cURL & REST examples
└── /changelog                # API versioning & changelog
```

### 9.2 Quickstart Guide Content

The quickstart should walk a developer through:

1. **Sign Up**: Create a RefreeG developer account (email + password only)
2. **Get API Keys**: Generate test + live keys
3. **Provide Bank Details**: Add beneficiary bank account to campaign
4. **Create Your First Campaign**: `curl` example, goes live instantly
5. **Accept a Donation**: Initialize payment flow
6. **Verify Payment**: Confirm donation success, receipt sent automatically
7. **Go Live**: Switch from test to live keys

### 9.3 Admin Dashboard Integration

RefreeG's existing admin dashboard will include a new **"API Monitoring"** section:

| Data Point        | Description                                   |
| ----------------- | --------------------------------------------- |
| Active API keys   | How many developers are using the API         |
| API campaigns     | All campaigns created via API (view-only)     |
| API donations     | Donation volume processed through API         |
| Revenue from API  | Platform fees collected (2% of each donation) |
| Campaign reports  | Flagged campaigns awaiting review             |
| API usage metrics | Request volume, error rates, top endpoints    |

---

## 10. Step-by-Step Implementation Tasks

### Phase 1: Foundation (API Key Infrastructure)

- [ ] **1.1** Create `api_keys` database table in Supabase with migration
- [ ] **1.2** Build API key generation utility (SHA-256 hashing, prefix extraction)
- [ ] **1.3** Create API key management server actions (`create`, `list`, `revoke`)
- [ ] **1.4** Build `apiKeyAuth` middleware function for `app/api/v1/*` routes
- [ ] **1.5** Add rate limiting middleware (in-memory + Redis for production)
- [ ] **1.6** Create Developer Dashboard UI page at `/dashboard/developer/api-keys`
- [ ] **1.7** Add API key CRUD UI (generate, view prefix, copy, revoke)
- [ ] **1.8** Write unit tests for key generation and auth middleware

### Phase 2: Campaign API

- [ ] **2.1** Create `api_campaigns` table in Supabase (separate from `causes`: complete isolation)
- [ ] **2.2** Create `campaign_reports` table for reporting system
- [ ] **2.3** Create `app/api/v1/campaigns/route.ts`: `POST` (create, goes active immediately) + `GET` (list)
- [ ] **2.4** Create `app/api/v1/campaigns/[id]/route.ts`: `GET` (details) + `PATCH` (update) + `DELETE` (cancel)
- [ ] **2.5** Create `app/api/v1/campaigns/[id]/pause/route.ts` + `resume/route.ts`
- [ ] **2.6** Create `app/api/v1/campaigns/[id]/donations/route.ts`: `GET` (list donations)
- [ ] **2.7** Create `app/api/v1/campaigns/[id]/report/route.ts`: `POST` (report to RefreeG)
- [ ] **2.8** Create `app/api/v1/campaigns/categories/route.ts`: `GET` (list categories)
- [ ] **2.9** Create `app/api/v1/campaigns/validate/route.ts`: `POST` (validate AI output)
- [ ] **2.10** Add Zod validation schemas for all campaign request bodies (including strict `bank_account` validation: 10-digit account_number, required bank_code and account_name)
- [ ] **2.11** Implement `payout_mode` logic ("immediate" → Paystack sub-account direct; "after_deadline" → hold)
- [ ] **2.12** Auto-create Paystack sub-account from developer-provided `bank_account` during campaign creation
- [ ] **2.13** Write integration tests for all campaign endpoints

### Phase 3: Donation & Payment API

- [ ] **3.1** Create `app/api/v1/donations/initialize/route.ts`: `POST` (init Paystack with 2% split)
- [ ] **3.2** Create `app/api/v1/donations/verify/[reference]/route.ts`: `GET` (verify payment)
- [ ] **3.3** Create `app/api/v1/donations/[id]/route.ts`: `GET` (donation details)
- [ ] **3.4** Wire up Paystack `initializeTransaction` with 2% platform fee via `transaction_charge`
- [ ] **3.5** Handle `callback_url` parameter for developer-controlled redirects
- [ ] **3.6** Implement automatic email receipt sending after successful donation
- [ ] **3.7** Support anonymous donations (`is_anonymous: true` → name shown as "Anonymous")
- [ ] **3.8** Add Zod validation schemas for donation request bodies
- [ ] **3.9** Write integration tests for full donation flow

### Phase 4: Webhook System

- [ ] **4.1** Create `webhooks` database table in Supabase with migration
- [ ] **4.2** Create `app/api/v1/webhooks/route.ts`: `POST` (register) + `GET` (list)
- [ ] **4.3** Create `app/api/v1/webhooks/[id]/route.ts`: `DELETE` (unsubscribe)
- [ ] **4.4** Build webhook dispatcher utility (HMAC-SHA256 signing, retry logic)
- [ ] **4.5** Integrate webhook dispatch into campaign events
- [ ] **4.6** Integrate webhook dispatch into donation events
- [ ] **4.7** Add webhook delivery log table and retry mechanism (3 retries, exponential backoff)
- [ ] **4.8** Write tests for webhook delivery and signature verification

### Phase 5: Campaign Reporting System

- [ ] **5.1** Build report submission endpoint
- [ ] **5.2** Add reporting UI to admin dashboard (view reports, investigate, take down)
- [ ] **5.3** Implement campaign takedown flow (RefreeG admin → set status to "cancelled")

### Phase 6: Standardized API Response Format

- [ ] **6.1** Create response helper utilities:
  ```typescript
  // lib/api/response.ts
  function success(data: any, status = 200);
  function error(message: string, code: string, status: number);
  function paginated(data: any[], total: number, limit: number, offset: number);
  ```
- [ ] **6.2** Create standardized error codes enum:
  ```typescript
  enum ApiErrorCode {
    INVALID_API_KEY = "invalid_api_key",
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
    CAMPAIGN_NOT_FOUND = "campaign_not_found",
    INVALID_CATEGORY = "invalid_category",
    VALIDATION_ERROR = "validation_error",
    PAYMENT_FAILED = "payment_failed",
    INVALID_BANK_ACCOUNT = "invalid_bank_account",
    CAMPAIGN_NOT_ACTIVE = "campaign_not_active",
  }
  ```
- [ ] **6.3** Apply standardized format across all v1 endpoints

### Phase 7: Developer Documentation Site

- [ ] **7.1** Set up docs page layout at `app/docs/layout.tsx` with sidebar navigation
- [ ] **7.2** Build docs landing page at `app/docs/page.tsx`
- [ ] **7.3** Create "Getting Started" pages (Introduction, Quickstart, Authentication)
- [ ] **7.4** Create "Guides" pages:
  - [ ] Create Campaign guide
  - [ ] Accept Donations guide
  - [ ] Payout Options guide (immediate vs. after-deadline)
  - [ ] Bank Account Setup guide
  - [ ] Webhooks guide
  - [ ] Notifications Blueprint (SMTP integration)
  - [ ] Campaign Reporting guide
  - [ ] AI Integration guide
  - [ ] Testing (Sandbox) guide
- [ ] **7.5** Create "API Reference" pages (Campaigns, Donations, Banks, Webhooks, Errors)
- [ ] **7.6** Build interactive code examples with language tabs (cURL, JS, Python)
- [ ] **7.7** Create changelog page

### Phase 8: Admin Dashboard Integration

- [ ] **8.1** Add "API Monitoring" section to existing admin dashboard
- [ ] **8.2** Create API campaigns view (list all campaigns created via API)
- [ ] **8.3** Create API donations view (donation volume, revenue from 2% fees)
- [ ] **8.4** Create campaign reports view (flagged campaigns, investigation tools)
- [ ] **8.5** Add campaign takedown action (admin can cancel reported API campaigns)
- [ ] **8.6** Add API usage analytics (request volume, active keys, error rates)

### Phase 9: SDK & Developer Experience

- [ ] **9.1** Create `refreeg-js` npm package (lightweight API wrapper)
  ```typescript
  import RefreeG from "refreeg-js";
  const refreeg = new RefreeG("rg_live_sk_...");
  const campaign = await refreeg.campaigns.create({ title: "...", goal: 5000 });
  const payment = await refreeg.donations.initialize({
    campaign_id: "...",
    amount: 1000,
  });
  ```
- [ ] **9.2** Create Python SDK (`refreeg-python`)
- [ ] **9.3** Publish SDKs to npm / PyPI
- [ ] **9.4** Add SDK docs to documentation site

### Phase 10: Testing & Sandbox

- [ ] **10.1** Create sandbox environment (test mode API keys use test Paystack keys)
- [ ] **10.2** Add test data seeding endpoint for sandbox (`POST /api/v1/test/seed`)
- [ ] **10.3** Ensure test payments don't process real money
- [ ] **10.4** Write end-to-end tests for full flow: key generation → campaign → donation → webhook
- [ ] **10.5** Load testing for rate limit verification

### Phase 11: Security Hardening

- [ ] **11.1** Audit all endpoints for proper API key auth guard
- [ ] **11.2** Add input sanitization across all endpoints
- [ ] **11.3** Implement request logging and audit trail
- [ ] **11.4** Set up CORS policy for API endpoints

### Phase 12: Launch Preparation

- [ ] **12.1** Set up API monitoring and alerting (uptime, error rates)
- [ ] **12.2** Write API Terms of Service
- [ ] **12.3** Create changelog/versioning strategy (v1 → v2 migration path)
- [ ] **12.4** Beta launch with selected developer partners
- [ ] **12.5** Public launch announcement

---

## Appendix A: PRD vs Codebase Schema Discrepancies

| PRD Field                           | Actual Codebase                                 | Notes                                               |
| ----------------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| `description` (type: `text`)        | `description` (type: `string`)                  | Same field, type naming difference                  |
| `currency` (campaign field)         | `currency` (only in `CauseFormData`, not in DB) | Currency is on the form, not stored in causes table |
| `donation_amount`                   | `amount`                                        | Field name difference                               |
| `donor_name`                        | `name`                                          | Field name difference                               |
| `donor_email`                       | `email`                                         | Field name difference                               |
| `payment_method` (card/bank/wallet) | Not in donation schema                          | Paystack handles payment method selection           |
| -                                   | `image` (cover image URL)                       | Missing from PRD                                    |
| -                                   | `days_active` (number)                          | Missing from PRD                                    |
| -                                   | `rejection_reason` (string)                     | Missing from PRD                                    |
| -                                   | `faqs` (JSONB array)                            | Missing from PRD                                    |
| -                                   | `is_anonymous` (boolean)                        | Missing from PRD donation schema                    |
| -                                   | `message` (string)                              | Missing from PRD donation schema                    |
| -                                   | `tip_amount` (number)                           | Missing from PRD donation schema                    |
| -                                   | `receipt_url` (string)                          | Missing from PRD donation schema                    |
| -                                   | `shared` (number, share count)                  | Missing from PRD                                    |

---

## Appendix B: File Tree for New API Routes

```
app/api/v1/
├── campaigns/
│   ├── route.ts                    # POST (create) + GET (list)
│   ├── [id]/
│   │   ├── route.ts                # GET (details) + PATCH (update) + DELETE (cancel)
│   │   ├── pause/route.ts          # POST (pause campaign)
│   │   ├── resume/route.ts         # POST (resume campaign)
│   │   ├── report/route.ts         # POST (report campaign to RefreeG)
│   │   └── donations/
│   │       └── route.ts            # GET (list donations for campaign)
│   ├── categories/
│   │   └── route.ts                # GET (list categories)
│   └── validate/
│       └── route.ts                # POST (validate AI output)

├── donations/
│   ├── initialize/
│   │   └── route.ts                # POST (initiate payment + 2% split)
│   ├── verify/
│   │   └── [reference]/
│   │       └── route.ts            # GET (verify payment + send receipt)
│   └── [id]/
│       └── route.ts                # GET (donation details)
├── webhooks/
│   ├── route.ts                    # POST (register) + GET (list)
│   └── [id]/
│       └── route.ts                # DELETE (unsubscribe)
├── auth/
│   ├── register/
│   │   └── route.ts                # POST (developer registration)
│   └── api-keys/
│       ├── route.ts                # POST (generate) + GET (list)
│       └── [id]/
│           └── route.ts            # DELETE (revoke)
└── test/
    └── seed/
        └── route.ts                # POST (seed sandbox data)
```

---

## Appendix C: Standard API Error Response

```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "Invalid request body",
    "details": [
      {
        "field": "category",
        "message": "Must be one of: education, health, environment, community, disaster, animals, creative, business"
      },
      {
        "field": "goal",
        "message": "Must be a positive number greater than 1000"
      }
    ]
  }
}
```
