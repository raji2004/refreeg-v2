# RefreeG Mobile API Reference & Developer Guide

Welcome to the **RefreeG Mobile API Documentation**. This comprehensive guide documents all 70+ mobile backend endpoints exposed under `/api/mobile/*` in the RefreeG Next.js backend, detailing request/response contracts, authentication requirements, and client integration patterns.

---

## 1. Architecture & Protocol Standards

### Base URL

- **Development:** `http://localhost:3000` (or `http://10.0.2.2:3000` for Android emulator)
- **Production:** `https://www.refreeg.com`
- **Route Prefix:** `/api/mobile`

### Standard Response Envelope

All mobile endpoints return standardized JSON payloads wrapped by `apiSuccess` and `apiError`:

#### Success Format (`HTTP 200 / 201`)

```json
{
  "success": true,
  "data": { ... }
}
```

#### Error Format (`HTTP 400 / 401 / 403 / 404 / 409 / 500`)

```json
{
  "success": false,
  "error": "Human-readable error description"
}
```

### Data Serialization Rules

- **Timestamps:** ISO-8601 strings (e.g. `2026-10-25T09:30:00.000Z`).
- **Financial Amounts:** Formatted as standard JavaScript numbers (Prisma `Decimal` and `BigInt` are automatically cast to numbers by the backend serialization pipeline).
- **CORS Support:** All endpoints return preflight `OPTIONS` headers with `Access-Control-Allow-Origin: *` and support credentials.

### Authentication

Endpoints requiring authentication enforce the `Bearer` token scheme in the HTTP `Authorization` header:

```http
Authorization: Bearer <jwt_access_token>
```

Tokens are generated upon login/verification and contain `{ userId, email }`. When tokens expire, the client uses `POST /api/mobile/auth/refresh` with its stored `refreshToken`.

---

## 2. Authentication & Account Recovery (`/api/mobile/auth`)

### 2.1 Login

- **Method & Route:** `POST /api/mobile/auth/login`
- **Auth:** Public
- **Description:** Authenticates with email and password. Returns user profile, access token, and refresh token.

#### Request Body

```json
{
  "email": "creator@example.com",
  "password": "SecurePassword123!"
}
```

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_99812",
      "email": "creator@example.com",
      "fullName": "Jane Doe",
      "accountType": "individual",
      "profilePhoto": "https://cdn.refreeg.com/avatars/user.jpg",
      "isVerified": true,
      "onboardingCompleted": true
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "d8a1c97f-..."
  }
}
```

---

### 2.2 Register

- **Method & Route:** `POST /api/mobile/auth/register`
- **Auth:** Public
- **Description:** Creates an unverified account and sends a 6-digit verification code to the user's email.

#### Request Body

```json
{
  "email": "backer@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Backer",
  "accountType": "individual",
  "referralCode": "REF-1092"
}
```

#### Response (`201 Created`)

```json
{
  "success": true,
  "data": {
    "message": "Registration successful. Please verify the OTP sent to your email.",
    "userId": "usr_7721"
  }
}
```

---

### 2.3 Verify Registration OTP

- **Method & Route:** `POST /api/mobile/auth/verify-otp`
- **Auth:** Public
- **Description:** Validates registration OTP, activates account, and returns authenticated JWT tokens.

#### Request Body

```json
{
  "email": "backer@example.com",
  "otp": "491023"
}
```

---

### 2.4 Resend Registration OTP

- **Method & Route:** `POST /api/mobile/auth/resend-otp`
- **Auth:** Public

#### Request Body

```json
{
  "email": "backer@example.com"
}
```

---

### 2.5 Google Sign-In / OAuth

- **Method & Route:** `POST /api/mobile/auth/google`
- **Auth:** Public
- **Description:** Verifies Google Sign-In `idToken` directly with Google OAuth servers. If user does not exist, registers them automatically.

#### Request Body

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs...",
  "accountType": "individual"
}
```

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "user": { "id": "usr_google_123", "email": "...", "fullName": "..." },
    "token": "jwt...",
    "refreshToken": "..."
  }
}
```

---

### 2.6 Refresh Session Token

- **Method & Route:** `POST /api/mobile/auth/refresh`
- **Auth:** Public
- **Description:** Rotates an expired access token using the long-lived refresh token.

#### Request Body

```json
{
  "refreshToken": "d8a1c97f-..."
}
```

---

### 2.7 Forgot Password

- **Method & Route:** `POST /api/mobile/auth/forgot-password`
- **Auth:** Public
- **Description:** Sends a 6-digit password reset OTP to the user's email.

#### Request Body

```json
{
  "email": "creator@example.com"
}
```

---

### 2.8 Verify Reset Password OTP

- **Method & Route:** `POST /api/mobile/auth/verify-reset-otp`
- **Auth:** Public
- **Description:** Verifies the reset code and issues a short-lived `resetToken`.

#### Request Body

```json
{
  "email": "creator@example.com",
  "otp": "819201"
}
```

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "resetToken": "rst_98fa9128...",
    "message": "Code verified successfully."
  }
}
```

---

### 2.9 Reset Password

- **Method & Route:** `POST /api/mobile/auth/reset-password`
- **Auth:** Public
- **Description:** Commits new password using the validated `resetToken`.

#### Request Body

```json
{
  "email": "creator@example.com",
  "resetToken": "rst_98fa9128...",
  "newPassword": "NewStrongPassword456!"
}
```

---

## 3. User Profile & Payout Banking (`/api/mobile/profile`)

### 3.1 Get Current User Profile

- **Method & Route:** `GET /api/mobile/profile`
- **Auth:** Bearer Token
- **Description:** Retrieves the authenticated user's complete profile, active tier, and verification status.

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "id": "usr_99812",
    "email": "creator@example.com",
    "fullName": "Jane Doe",
    "username": "janedoe",
    "bio": "Community organiser for rural clean water.",
    "phone": "+2348012345678",
    "country": "Nigeria",
    "state": "Lagos",
    "city": "Ikeja",
    "profilePhoto": "https://cdn.refreeg.com/avatars/user.jpg",
    "accountType": "individual",
    "isVerified": true,
    "kycTier": 2,
    "onboardingCompleted": true,
    "interests": ["clean_water", "education", "health"]
  }
}
```

---

### 3.2 Update User Profile

- **Method & Route:** `PUT /api/mobile/profile`
- **Auth:** Bearer Token
- **Request Body:**

```json
{
  "fullName": "Jane M. Doe",
  "bio": "Updated bio...",
  "state": "Lagos",
  "city": "Lekki",
  "phone": "+2348099999999"
}
```

---

### 3.3 Update Avatar Photo

- **Method & Route:** `POST /api/mobile/profile/photo`
- **Auth:** Bearer Token
- **Request Body:**

```json
{
  "profilePhoto": "https://s3.amazonaws.com/refreeg-media/avatars/u123.jpg"
}
```

---

### 3.4 Payout Bank Account Details

- **Method & Route:** `GET /api/mobile/profile/bank` & `POST /api/mobile/profile/bank`
- **Auth:** Bearer Token
- **Description:** `GET` returns current settlement bank; `POST` saves a verified Nigerian bank account for campaign payouts.

#### POST Request Body

```json
{
  "bankCode": "058",
  "bankName": "Guaranty Trust Bank",
  "accountNumber": "0123456789",
  "accountName": "JANE MARY DOE"
}
```

---

### 3.5 Username Check

- **Method & Route:** `GET /api/mobile/profile/username-check?username={username}`
- **Auth:** Public
- **Response:** `{ "success": true, "data": { "available": true } }`

---

### 3.6 Public Profile by Username

- **Method & Route:** `GET /api/mobile/profile/{username}`
- **Auth:** Public
- **Description:** Public portfolio view of a creator with their active causes and impact history.

---

## 4. Causes & Campaigns (`/api/mobile/causes`)

### 4.1 Browse Causes (Feed)

- **Method & Route:** `GET /api/mobile/causes`
- **Auth:** Optional Bearer Token
- **Query Parameters:**
  - `page` (default: 1): Page number
  - `limit` (default: 10): Items per page
  - `category`: Filter (e.g. `education`, `health`, `clean_water`, `technology`)
  - `sort`: `trending`, `recent`, `ending_soon`, `most_funded`
  - `search`: Free text search in title/story

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "causes": [
      {
        "id": "cause_101",
        "title": "Clean Water Borehole for Agbado Community",
        "story": "Providing 5,000 residents access to clean portable drinking water.",
        "category": "Clean Water",
        "targetAmount": 3500000,
        "raisedAmount": 2100000,
        "currency": "NGN",
        "coverImage": "https://cdn.refreeg.com/campaigns/c1.jpg",
        "donorsCount": 142,
        "creator": {
          "id": "usr_99812",
          "fullName": "Jane Doe",
          "isVerified": true,
          "profilePhoto": "..."
        },
        "daysLeft": 18,
        "isLiked": false
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 48
    }
  }
}
```

---

### 4.2 Create Cause

- **Method & Route:** `POST /api/mobile/causes`
- **Auth:** Bearer Token (KYC Verified Recommended)
- **Request Body:**

```json
{
  "title": "School Library Rehabilitation",
  "category": "Education",
  "story": "Rebuilding 4 classrooms and providing 2,000 textbooks.",
  "targetAmount": 2000000,
  "currency": "NGN",
  "coverImage": "https://s3.amazonaws.com/.../cover.jpg",
  "mediaUrls": ["https://s3.amazonaws.com/.../img1.jpg"],
  "milestones": [
    { "title": "Roofing & Plastering", "targetAmount": 800000 },
    { "title": "Desks & Whiteboards", "targetAmount": 600000 },
    { "title": "Textbooks & Library Shelves", "targetAmount": 600000 }
  ]
}
```

---

### 4.3 Cause Details

- **Method & Route:** `GET /api/mobile/causes/{id}`
- **Auth:** Optional Bearer Token
- **Description:** Retrieves the cause's full story, verified milestone progress, proof receipts, and donor leaderboards.

---

### 4.4 Follow Cause

- **Method & Route:** `POST /api/mobile/causes/{id}/follow`
- **Auth:** Bearer Token
- **Response:** `{ "success": true, "data": { "isFollowing": true } }`

---

### 4.5 Share Cause

- **Method & Route:** `POST /api/mobile/causes/{id}/share`
- **Auth:** Public
- **Response:** Returns deep link and increments share analytics counter.

---

### 4.6 Escrow Proof Updates (Milestone Verification)

- **`GET /api/mobile/causes/{id}/proof-updates`**: Fetches milestone proof receipts.
- **`POST /api/mobile/causes/{id}/proof-updates`**: Creator uploads milestone proof receipts (invoices, photos of completed work) to request escrow funds release.

---

## 5. Comments & Discussion Threads (`/api/mobile/comments`)

- **`GET /api/mobile/comments/cause/{id}`**: Retrieves top-level comments and replies for a campaign.
- **`POST /api/mobile/comments/cause/{id}`**: Adds a comment to a cause. Body: `{ "content": "..." }`
- **`GET /api/mobile/comments/{id}/replies`**: Fetches nested reply thread for a comment.
- **`POST /api/mobile/comments/{id}/replies`**: Posts a reply to a specific comment.
- **`DELETE /api/mobile/comments/{id}`**: Deletes user's own comment.

---

## 6. Petitions & Advocacy (`/api/mobile/petitions` & `/signatures`)

### 6.1 Browse & Create Petitions

- **`GET /api/mobile/petitions`**: Paginated listing of petitions.
- **`POST /api/mobile/petitions`**: Creates a petition.

```json
{
  "title": "Repair the Damaged Sagamu-Ikorodu Road",
  "description": "Petitioning the Ministry of Works to address deadly potholes.",
  "targetSignatures": 5000,
  "recipient": "Federal Ministry of Works",
  "category": "Infrastructure",
  "coverImage": "https://..."
}
```

- **`GET /api/mobile/petitions/{id}`**: Retrieves detailed petition statistics.

---

### 6.2 Sign a Petition

- **Method & Route:** `POST /api/mobile/signatures`
- **Auth:** Bearer Token
- **Request Body:**

```json
{
  "petitionId": "pet_123",
  "reason": "I commute on this road daily and have suffered vehicle breakdowns.",
  "isAnonymous": false
}
```

- **`GET /api/mobile/signatures/check?petition_id={id}`**: Checks whether authenticated user has already signed.

---

## 7. Payments, Donations & Paystack Tokenization (`/api/mobile/payments`)

### 7.1 Initialize Paystack Donation

- **Method & Route:** `POST /api/mobile/payments/initialize`
- **Auth:** Optional Bearer Token (Guest donations supported)
- **Description:** Generates a Paystack checkout session for NGN card, USSD, or Bank Transfer.

#### Request Body

```json
{
  "causeId": "cause_101",
  "amount": 5000,
  "currency": "NGN",
  "donorName": "Adebayo S.",
  "donorEmail": "adebayo@example.com",
  "isAnonymous": false,
  "tipAmount": 200,
  "callbackUrl": "refreeg://payment/callback"
}
```

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/08x9a...",
    "accessCode": "08x9a...",
    "reference": "REF_DON_17298492019"
  }
}
```

---

### 7.2 Verify Paystack Donation

- **Method & Route:** `GET /api/mobile/payments/verify?reference={reference}`
- **Auth:** Optional
- **Description:** Verifies payment status with Paystack, updates cause funding balance, and issues EIZA backer reward.

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "status": "success",
    "amount": 5000,
    "causeId": "cause_101",
    "reference": "REF_DON_17298492019",
    "eizaRewarded": 25
  }
}
```

---

### 7.3 Tokenized 1-Click Card Charges

- **`GET /api/mobile/user/cards`**: Lists saved cards (last4, brand, expiry).
- **`POST /api/mobile/user/cards/initialize`**: Initializes a ₦50 refundable authorization charge to securely store and tokenize a new debit/credit card.
- **`POST /api/mobile/payments/charge-card`**: Direct 1-click donation using saved card token:

```json
{
  "causeId": "cause_101",
  "cardId": "crd_88192",
  "amount": 10000
}
```

- **`DELETE /api/mobile/user/cards/{id}`**: Detaches and deletes a saved card.

---

### 7.4 Crypto Donation Deposit Addresses

- **Method & Route:** `GET /api/mobile/crypto/address?cause_id={id}&network={network}`
- **Auth:** Public
- **Networks:** `USDT_TRC20`, `USDT_ERC20`, `BTC`, `ETH`
- **Response:** Returns unique custodial deposit address with QR code payload.

---

## 8. Identity Verification / KYC (Didit Native SDK) (`/api/mobile/kyc`)

### 8.1 Get KYC Status

- **Method & Route:** `GET /api/mobile/kyc`
- **Auth:** Bearer Token
- **Description:** Returns the current identity verification status, KYC tier level, and any compliance review notes.

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "status": "approved",
    "isVerified": true,
    "kycTier": 2,
    "rejectionReason": null
  }
}
```

#### Status Enum Values

- `not_started`: User has not submitted identity documents.
- `in_progress`: Session created, user has not completed camera liveness/ID capture.
- `pending`: Documents submitted, undergoing automated/manual review.
- `resubmitted` / `requires_action`: Verification requires corrections (e.g. upload front/back, retake photo).
- `rejected`: Verification was declined (reason provided in `rejectionReason`).
- `approved`: Verified Tier 2 Citizen.

---

### 8.2 Create Native Verification Session

- **Method & Route:** `POST /api/mobile/kyc`
- **Auth:** Bearer Token
- **Description:** Initializes or resumes a verification session. If the user already has a pending session and `force_new` is not `true`, the active session is returned (`200 OK`, `resumed: true`) to save provider API costs. Didit manages expiration natively via webhooks (`status: "Expired"` or `"Abandoned"`). When a new session is created (`201 Created`), any existing pending sessions are marked as `abandoned` to preserve audit history.

#### Request Body

```json
{
  "force_new": false,
  "callback_url": "refreeg://kyc/callback"
}
```

#### Response (`201 Created` or `200 OK` if resumed)

```json
{
  "success": true,
  "data": {
    "session_id": "8fa3c012-70b1-4f91-a182-120984920192",
    "session_token": "eyJhbGciOi...",
    "verification_url": "https://verification.didit.me/v3/session/8fa3c012...",
    "resumed": true
  }
}
```

#### Mobile Flutter Integration Pattern

```dart
// 1. Request session token from backend
final session = await KycGateway().createVerificationSession(forceNew: true);
final token = session['session_token'];

// 2. Pass token to Native Didit SDK
final result = await DiditSdk.startVerification(
  token,
  config: const DiditConfig(languageCode: 'en', loggingEnabled: false),
);

// 3. Handle sealed outcome result
switch (result) {
  case VerificationCompleted(:final session):
    // Optimistic UI update; Webhook ensures database consistency
    break;
  case VerificationCancelled():
    // User tapped close
    break;
  case VerificationFailed(:final error):
    // Camera denied, network timeout, or session expired
    break;
}
```

---

## 9. Onboarding Step Flow (`/api/mobile/onboarding`)

- **`GET /api/mobile/onboarding`**: Retrieves current onboarding state and saved draft profile.
- **`POST /api/mobile/onboarding/step`**: Saves step 1 personal/owner profile (`fullName`, `gender`, `bio`).
- **`POST /api/mobile/onboarding/organization`**: Saves organisation legal setup (`rcNumber`, `organizationName`, `type`).
- **`POST /api/mobile/onboarding/interests`**: Saves 3+ interest categories (awards 150 EIZA Welcome Bonus).
- **`POST /api/mobile/onboarding/complete`**: Marks `onboardingCompleted = true` on the user record.

---

## 10. Geo & Banking Reference (`/api/mobile/geo`)

- **`GET /api/mobile/geo/countries`**: List of supported countries.
- **`GET /api/mobile/geo/states?country=NG`**: 36 Nigerian states + FCT.
- **`GET /api/mobile/geo/cities?state=Lagos`**: Cities in selected state.
- **`GET /api/mobile/geo/banks`**: Centralized Paystack bank directory with bank codes (e.g. `058` for GTBank, `011` for First Bank).
- **`POST /api/mobile/geo/banks/verify`**: Real-time NIBSS account lookup before saving.

```json
{
  "accountNumber": "0123456789",
  "bankCode": "058"
}
```

- **Response:** `{ "success": true, "data": { "accountName": "JANE MARY DOE" } }`

---

## 11. Media Uploads (`/api/mobile/upload`)

### 11.1 Pre-signed S3 Upload URL

- **Method & Route:** `POST /api/mobile/upload/presign`
- **Auth:** Bearer Token
- **Description:** Direct-to-S3 pre-signed upload URL generator to keep mobile file uploads fast and bandwidth-efficient.

#### Request Body

```json
{
  "fileName": "proof_receipt.jpg",
  "fileType": "image/jpeg",
  "folder": "campaign_proofs"
}
```

#### Response (`200 OK`)

```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://refreeg-media.s3.amazonaws.com/campaign_proofs/...?",
    "fileUrl": "https://cdn.refreeg.com/campaign_proofs/proof_receipt.jpg"
  }
}
```

---

## 12. Creator Dashboard & Analytics (`/api/mobile/dashboard`)

- **`GET /api/mobile/dashboard/stats`**: Total donations, total backers, active campaigns count, and milestone velocity.
- **`GET /api/mobile/dashboard/trends`**: Timeseries donation charts over 7d, 30d, 90d, 1y.
- **`GET /api/mobile/dashboard/causes`**: Creator's cause list with view-to-donation conversion rates.
- **`GET /api/mobile/dashboard/petitions`**: Creator's petitions with signature velocity.
- **`GET /api/mobile/dashboard/analytics/cause/{id}`**: Detailed analytics for a specific campaign.

---

## 13. Notifications & FCM Device Management (`/api/mobile/notifications` & `/devices`)

### 13.1 In-App Notifications

- **`GET /api/mobile/notifications`**: List of notifications with pagination and unread counts.
- **`POST /api/mobile/notifications/read`**:

```json
{
  "notificationId": "notif_123" // or omit/pass "all" to mark all as read
}
```

### 13.2 Firebase Cloud Messaging (FCM) Device Registration

- **Method & Route:** `POST /api/mobile/devices`
- **Auth:** Bearer Token
- **Description:** Registers the device FCM push token to receive real-time push notifications for KYC approvals, donations received, and milestone releases.

#### Request Body

```json
{
  "fcmToken": "eAbCdEf_123456...",
  "deviceType": "android",
  "appVersion": "1.0.0"
}
```

- **`DELETE /api/mobile/devices`**: Unregisters token upon logout:

```json
{
  "fcmToken": "eAbCdEf_123456..."
}
```

---

## 14. Quick Verification & Test Checklist

Developers can test mobile API endpoints using cURL or Postman:

```bash
# 1. Health & Public Causes Feed
curl -X GET "http://localhost:3000/api/mobile/causes?limit=2"

# 2. Login
curl -X POST "http://localhost:3000/api/mobile/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@example.com","password":"Password123!"}'

# 3. Authenticated Profile View
curl -X GET "http://localhost:3000/api/mobile/profile" \
  -H "Authorization: Bearer <your_jwt_token>"

# 4. Generate KYC Native Session Token
curl -X POST "http://localhost:3000/api/mobile/kyc" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"force_new":true}'
```
