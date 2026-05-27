export interface ModelField {
  name: string;
  type: string;
  description: string;
  isOptional?: boolean;
  isRelation?: boolean;
}

export interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  fields: ModelField[];
}

export const API_MODELS: ModelDefinition[] = [
  {
    id: "user-model",
    name: "User Profile",
    description: "Represents a registered user on the platform. Can be a donor, cause creator, or developer.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "email", type: "String", description: "User's email address" },
      { name: "username", type: "String", isOptional: true, description: "Unique username" },
      { name: "fullName", type: "String", isOptional: true, description: "Full display name" },
      { name: "accountType", type: "String", isOptional: true, description: "'individual', 'organization', 'developer'" },
      { name: "profilePhoto", type: "String", isOptional: true, description: "S3 key for the profile image" },
      { name: "bio", type: "String", isOptional: true, description: "User biography" },
      { name: "location", type: "String", isOptional: true, description: "City, Country" },
      { name: "referralCode", type: "String", isOptional: true, description: "Unique code for inviting others" },
      { name: "isVerified", type: "Boolean", description: "Whether the user's KYC is approved" },
      { name: "eiza_balance", type: "Decimal", description: "Current EIZA reward points balance" },
      { name: "createdAt", type: "DateTime", description: "Account creation timestamp" },
    ]
  },
  {
    id: "cause-model",
    name: "Cause",
    description: "A crowdfunding campaign created by a user.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "userId", type: "UUID", isRelation: true, description: "ID of the user who created the cause" },
      { name: "title", type: "String", description: "Cause title" },
      { name: "description", type: "String", isOptional: true, description: "Detailed description (Markdown)" },
      { name: "category", type: "String", description: "E.g., 'Health', 'Education', etc." },
      { name: "goal", type: "Decimal", description: "Funding goal in NGN" },
      { name: "raised", type: "Decimal", description: "Amount raised so far in NGN" },
      { name: "status", type: "String", description: "'pending', 'approved', 'rejected', 'completed'" },
      { name: "image", type: "String", isOptional: true, description: "S3 key for the cover image" },
      { name: "daysActive", type: "Int", isOptional: true, description: "Duration of the campaign in days" },
      { name: "createdAt", type: "DateTime", description: "Creation timestamp" },
    ]
  },
  {
    id: "donation-model",
    name: "Donation",
    description: "A financial contribution to a cause.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "causeId", type: "UUID", isRelation: true, description: "ID of the cause" },
      { name: "userId", type: "UUID", isOptional: true, isRelation: true, description: "ID of the registered donor (if logged in)" },
      { name: "amount", type: "Decimal", description: "Donation amount in NGN" },
      { name: "email", type: "String", description: "Donor's email address" },
      { name: "name", type: "String", isOptional: true, description: "Donor's name" },
      { name: "message", type: "String", isOptional: true, description: "Optional message left by the donor" },
      { name: "is_anonymous", type: "Boolean", description: "If true, name is hidden publicly" },
      { name: "status", type: "String", description: "'pending', 'completed', 'failed'" },
      { name: "createdAt", type: "DateTime", description: "Timestamp of donation" },
    ]
  },
  {
    id: "petition-model",
    name: "Petition",
    description: "A signature-gathering campaign.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "user_id", type: "UUID", isRelation: true, description: "ID of the user who created the petition" },
      { name: "title", type: "String", description: "Petition title" },
      { name: "description", type: "String", description: "Detailed description" },
      { name: "category", type: "String", description: "E.g., 'Human Rights', 'Environment'" },
      { name: "goal", type: "Int", description: "Target number of signatures" },
      { name: "raised", type: "Int", description: "Current number of signatures" },
      { name: "status", type: "String", description: "'pending', 'approved', 'rejected'" },
      { name: "image", type: "String", isOptional: true, description: "S3 key for cover image" },
      { name: "createdAt", type: "DateTime", description: "Creation timestamp" },
    ]
  },
  {
    id: "signature-model",
    name: "Signature",
    description: "A signature on a petition.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "petition_id", type: "UUID", isRelation: true, description: "ID of the petition" },
      { name: "user_id", type: "UUID", isOptional: true, isRelation: true, description: "ID of registered signer" },
      { name: "name", type: "String", description: "Signer's name" },
      { name: "email", type: "String", description: "Signer's email" },
      { name: "message", type: "String", isOptional: true, description: "Optional comment" },
      { name: "is_anonymous", type: "Boolean", description: "If true, name is hidden publicly" },
      { name: "created_at", type: "DateTime", description: "Timestamp of signature" },
    ]
  },
  {
    id: "comment-model",
    name: "Comment",
    description: "A comment left on a cause.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "cause_id", type: "UUID", isRelation: true, description: "ID of the cause" },
      { name: "user_id", type: "UUID", isRelation: true, description: "ID of the author" },
      { name: "content", type: "String", description: "Comment text" },
      { name: "parent_id", type: "UUID", isOptional: true, isRelation: true, description: "ID of the parent comment (if reply)" },
      { name: "is_edited", type: "Boolean", description: "Whether the comment was modified" },
      { name: "created_at", type: "DateTime", description: "Creation timestamp" },
    ]
  },
  {
    id: "kyc-model",
    name: "KYC Verification",
    description: "Identity verification submission.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "user_id", type: "UUID", isRelation: true, description: "ID of the user" },
      { name: "document_type", type: "String", description: "E.g., 'national_id', 'passport'" },
      { name: "document_url", type: "String", description: "S3 key for the document image" },
      { name: "status", type: "String", description: "'pending', 'approved', 'rejected'" },
      { name: "verification_notes", type: "String", isOptional: true, description: "Notes from admin if rejected" },
      { name: "created_at", type: "DateTime", description: "Submission timestamp" },
    ]
  },
  {
    id: "pledge-model",
    name: "Pledge",
    description: "A commitment to donate to a cause in the future.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "cause_id", type: "UUID", isRelation: true, description: "ID of the cause" },
      { name: "user_id", type: "UUID", isOptional: true, isRelation: true, description: "ID of the pledging user" },
      { name: "amount", type: "Decimal", description: "Pledged amount in NGN" },
      { name: "name", type: "String", description: "Pledger's name" },
      { name: "email", type: "String", description: "Pledger's email address" },
      { name: "reminder_date", type: "DateTime", description: "When the reminder should be sent" },
      { name: "status", type: "String", description: "'pending', 'fulfilled', 'cancelled'" },
      { name: "created_at", type: "DateTime", description: "Pledge creation timestamp" },
    ]
  },
  {
    id: "wallet-model",
    name: "User Wallet",
    description: "Tracks the user's EIZA reward points balance.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "userId", type: "UUID", isRelation: true, description: "ID of the user" },
      { name: "balance", type: "Decimal", description: "Current point balance" },
      { name: "updatedAt", type: "DateTime", description: "Last balance update" },
    ]
  },
  {
    id: "streak-model",
    name: "User Streak",
    description: "Tracks user engagement and login streaks.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "userId", type: "UUID", isRelation: true, description: "ID of the user" },
      { name: "weeklyStreak", type: "Int", description: "Current consecutive weeks active" },
      { name: "isMonthlyActive", type: "Boolean", description: "Whether active this month" },
      { name: "lastActiveDate", type: "DateTime", description: "Last activity timestamp" },
    ]
  },
  {
    id: "reward-transaction-model",
    name: "Reward Transaction",
    description: "Log of points earned or spent by the user.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "userId", type: "UUID", isRelation: true, description: "ID of the user" },
      { name: "amount", type: "Decimal", description: "Points added or removed" },
      { name: "transactionType", type: "String", description: "E.g., 'comment', 'share', 'daily_login'" },
      { name: "createdAt", type: "DateTime", description: "Transaction timestamp" },
    ]
  },
  {
    id: "referral-model",
    name: "Referral",
    description: "Tracks users invited to the platform.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "referrerId", type: "UUID", isRelation: true, description: "User who sent the invite" },
      { name: "refereeId", type: "UUID", isOptional: true, isRelation: true, description: "User who joined (once registered)" },
      { name: "refereeEmail", type: "String", description: "Email address invited" },
      { name: "registered", type: "Boolean", description: "Whether the invitee has created an account" },
      { name: "createdAt", type: "DateTime", description: "Invite creation timestamp" },
    ]
  },
  {
    id: "crypto-donation-model",
    name: "Crypto Donation",
    description: "A donation made using cryptocurrency.",
    fields: [
      { name: "id", type: "UUID", description: "Unique identifier" },
      { name: "cause_id", type: "UUID", isRelation: true, description: "ID of the cause" },
      { name: "user_id", type: "UUID", isOptional: true, isRelation: true, description: "ID of the donor" },
      { name: "amount_in_naira", type: "Decimal", description: "Fiat equivalent" },
      { name: "amount_in_crypto", type: "Decimal", description: "Crypto amount" },
      { name: "network", type: "String", description: "E.g., 'Solana', 'Ethereum'" },
      { name: "currency", type: "String", description: "E.g., 'USDC', 'SOL'" },
      { name: "tx_signature", type: "String", description: "Blockchain transaction signature" },
      { name: "status", type: "String", description: "'pending', 'completed'" },
    ]
  }
];
