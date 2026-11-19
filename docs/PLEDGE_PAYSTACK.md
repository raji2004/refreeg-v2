# Pledges + Paystack: card capture now, charge on pledge date

This document explains how **quick donate** works in this codebase today, how that differs from a **dated pledge**, and how to implement **Paystack checkout now** with **money collected on the reminder / pledge date**, with funds routed to the **cause owner’s subaccount** (same split model as donate).

---

## 1. How donate works in RefreeG (reference)

End-to-end path you should mirror for pledges where possible:

| Step     | What happens                                                                                | Where in the repo                                                             |
| -------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| UI       | User enters amount, name, email; submits                                                    | `app/causes/[id]/donate/QuickDonateForm.tsx`                                  |
| Client   | `usePayment().initializePayment(...)` POSTs JSON to your API                                | `hooks/use-payment.ts`                                                        |
| Server   | Builds Paystack `transaction/initialize` payload (amount in **kobo**, subaccount, metadata) | `app/api/payments/initialize/route.ts` → `services/paystack.ts`               |
| Redirect | Browser goes to `authorization_url` (Paystack’s hosted card / bank UI)                      | `use-payment.ts` (`window.location.href = ...`)                               |
| Return   | `callback_url` defaults to `/causes/{causeId}/payment/verify`                               | `services/paystack.ts` (`callback_url`)                                       |
| Verify   | Client calls `/api/payments/verify` with `reference`                                        | `app/api/payments/verify/route.ts`, `app/causes/[id]/payment/verify/page.tsx` |
| Record   | **`charge.success`** webhook creates the donation row                                       | `app/api/webhooks/paystack/route.ts` → `createDonation(...)`                  |

Important implementation details:

- **Subaccount**: Donations pass `subaccounts` from the form; `initializeTransaction` picks a primary subaccount and sets `subaccount` + `bearer: "subaccount"` so the **cause owner receives the donation** (fee handling via `transaction_charge` matches your existing logic).
- **Metadata**: Paystack metadata carries `cause_id`, amounts, donor fields; the webhook relies on this for `createDonation`.

The pledge page today only inserts into `pledges` via `createPledge` in `actions/pledge-actions.ts`: **no Paystack call yet**.

---

## 2. Why “pay on pledge date” is not the same as standard donate

`transaction/initialize` + successful payment **settles money when the customer completes checkout**. That is what donate uses: **immediate** collection.

A **future pledge date** means you need a **second step** on that date: initiate a charge without showing the full Paystack UI again (unless the charge fails and you ask the user to pay again).

Paystack’s supported pattern for that is **recurring / returning charges** using an **authorization code** from an earlier **successful** card transaction.

Official concept (see Paystack docs: **Recurring charges** / **Charging returning customers**):

1. Customer completes at least one **successful** card payment (first transaction).
2. You **verify** the transaction and read `data.authorization`:
   - `authorization_code`: use this to charge again server-side.
   - `reusable`: must be `true` for subsequent charges; if `false`, you cannot rely on charging that card later.
3. Later, call the **Charge** API (or transaction charge endpoint documented for your API version) with `email`, `amount` (in kobo), and `authorization_code`.
4. Route funds to the cause owner using the same **subaccount** model as donate (`subaccount` + `bearer` + `transaction_charge` as appropriate).

There is **no** built-in “sleep until 2026-06-01” inside Paystack for a single checkout. **You** schedule the charge (cron job, queue worker, or Supabase scheduled function) on `pledges.reminder_date` (or a dedicated `charge_at` column).

---

## 3. Product choices you must make (legal + UX)

### 3.1 First transaction: what amount?

Paystack’s documentation for recurring flows typically expects a **first successful charge** (often citing a **minimum** amount in NGN before you can charge by authorization). That conflicts with “**₦0 today, full amount later**” unless you use a product-specific flow Paystack approves for your business.

Practical options:

| Strategy                         | User experience                                                 | Notes                                                                                                                         |
| -------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **A. Small verification charge** | Pays **₦50** (or your minimum) now; full pledge charged on date | Clean path to obtain `authorization_code`; you may **refund** the small charge or disclose it as non-refundable verification. |
| **B. Full amount now**           | Same as donate                                                  | Not a future deduction; only use if you change product definition.                                                            |
| **C. No card today**             | Email reminder on date with **Pay now** link                    | No stored card; not what you asked for, but simplest.                                                                         |

For “card now, money on pledge date,” **A** (or a Paystack-approved alternative your account manager confirms) is the usual engineering approach.

### 3.2 Long horizons

Authorization codes and cards **expire** or become **invalid** (lost, stolen, insufficient funds). For pledge dates **months away**, plan for:

- Failed charge → email + **new Paystack checkout** link.
- Optional: **cancel / update pledge** flows.

---

## 4. Recommended architecture in this repo

### 4.1 Data model (extend `pledges` or add a side table)

Your `pledges` table (`supabase/migrations/20241202000001_create_campaign_features.sql`) has `status` (`pending`, `fulfilled`, etc.) but no payment fields. You will need something like:

- `paystack_authorization_code`: **treat as secret**; encrypt at rest or store in a restricted table with RLS.
- `authorization_email`: email used for Paystack customer (needed for charge).
- `paystack_customer_code`: optional, if you use Paystack Customer API.
- `first_transaction_reference`: reference of the transaction that created the authorization (audit).
- `payment_status`: e.g. `awaiting_card`, `authorized`, `charge_pending`, `charged`, `failed`, `cancelled`.
- `charge_attempted_at`, `last_charge_error`: for support and retries.

Never expose `authorization_code` to the client.

### 4.2 Pledge checkout flow (align with donate)

1. User fills pledge form (amount, date, name, email): same UX as `PledgeScreen`, but **before** or **instead of** only calling `createPledge`:
2. **Create pledge row** in `pending` / `awaiting_card` with amount + `reminder_date`.
3. Call **`/api/payments/initialize`** (or a dedicated `/api/payments/pledge/initialize`) with:
   - `amount`: verification amount **or** full amount (per your product choice).
   - `causeId`, `serviceFee`, `subaccounts`: **same shape as** `QuickDonateForm` so the **cause owner subaccount** matches donate (`cause.user.sub_account_code` / profile subaccount).
   - `metadata`: include `pledge_id`, `type: "pledge_authorization"`, and future charge amount if you use a small first charge.
   - `callbackUrl`: e.g. `/causes/{id}/pledge/payment/verify?pledge_id=...` (new route similar to `payment/verify`).

4. User completes Paystack (card details on Paystack’s page: same as donate).

5. On **`charge.success`** webhook:
   - If `metadata.type === "pledge_authorization"`: verify transaction, extract `authorization_code`, check `reusable`, update `pledges` row, set status to **authorized / pending_charge**.
   - Do **not** call `createDonation` for this event unless the **full** amount was captured and that matches your product.

6. **Scheduled job** (daily cron / Edge Function):
   - Select pledges where `reminder_date === today` and `payment_status === 'authorized'`.
   - For each, server-side **Charge** with stored `authorization_code` and **pledge amount** (plus fee split consistent with donate).
   - On success: mark pledge `fulfilled`, optionally insert **donation** row for reporting, send receipt.
   - On failure: increment retries, notify user, optional status `charge_failed`.

### 4.3 Webhooks

Extend `app/api/webhooks/paystack/route.ts` to branch on `metadata`:

- `charge.success` + pledge authorization → store auth, **no** donation (if first charge was verification only).
- `charge.success` + scheduled charge → `createDonation` + fulfill pledge (or only fulfill pledge if donations are tracked elsewhere).

Always keep **HMAC verification** (already implemented).

### 4.4 Idempotency

The scheduler and webhook may race. Use:

- Unique constraint on `(pledge_id, charge_reference)` or
- Paystack reference stored on pledge after first successful scheduled charge.

---

## 5. Paystack API pieces (check current docs)

Names below follow common Paystack REST patterns; **verify paths and bodies** in [Paystack API documentation](https://paystack.com/docs/api/) for your API version.

1. **`POST /transaction/initialize`**: already wrapped in `services/paystack.ts`.
2. **`GET /transaction/verify/{reference}`**: you already have `verifyTransaction` / `verifyTransactionFull`; use full response to read `authorization`.
3. **`POST /transaction/charge_authorization`** or **`POST /charge`** with `authorization_code`: for the **future** charge (scheduler). Request body must include `email`, `amount` (kobo), `authorization_code`, and subaccount fields mirroring donate.

Add methods to `services/paystack.ts` only after confirming the exact endpoint from Paystack docs.

---

## 6. Environment and dashboard setup

Same as donate:

- `PAYSTACK_SECRET_KEY`: server only.
- Webhook URL registered in Paystack dashboard pointing to `https://<your-domain>/api/webhooks/paystack`.
- For local dev, use Paystack test keys and tools (CLI / ngrok) to receive webhooks.

Optional: `NEXT_PUBLIC_APP_URL` / `getBaseURL()` for `callback_url` (see `initializeTransaction`).

---

## 7. Security checklist

- [ ] Never send secret keys to the browser.
- [ ] Encrypt or restrict `authorization_code` storage.
- [ ] Validate webhook signatures (already done).
- [ ] Log references, not full PAN or auth codes.
- [ ] GDPR / privacy policy: storing payment method for future charge requires clear consent copy on the pledge screen.

---

## 8. Implementation order (suggested)

1. Decide **first-charge** strategy (verification vs full amount).
2. Add DB columns / migration for pledge payment state + auth storage.
3. Add `pledge_id` + type to Paystack metadata; extend webhook handler.
4. New verify page or extend `payment/verify` to handle pledge references and show “Card saved; we’ll charge on …”.
5. Implement `chargeAuthorization` (or equivalent) in `services/paystack.ts` + server-only route if you prefer not to call Paystack from Edge Functions directly.
6. Add scheduler (Supabase `pg_cron`, Vercel cron, or existing `supabase/functions/pledge-reminders` pattern) to run charges on `reminder_date`.
7. QA in Paystack **test mode**: successful charge, failed card, expired auth, `reusable: false`.

---

## 9. Files to read first in this repo

- `app/causes/[id]/donate/QuickDonateForm.tsx`: `initializePayment` payload.
- `hooks/use-payment.ts`: redirect to Paystack.
- `services/paystack.ts`: initialize + verify patterns.
- `app/api/webhooks/paystack/route.ts`: `charge.success` → `createDonation`.
- `app/campaign/_components/pledge-screen.tsx`: where to plug checkout + messaging.
- `actions/pledge-actions.ts`: `createPledge` insert.
- `supabase/functions/pledge-reminders/index.ts`: possible place to extend from “email only” to “charge + email”.

---

## 10. Disclaimer

Paystack’s rules, minimum amounts, and reusable-authorization behavior can change. Confirm **recurring / charge authorization** eligibility with Paystack for your **business type** and **markets** before going live. This README describes a standard integration pattern; it is not legal or financial advice.
