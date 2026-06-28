-- CreateEnum
CREATE TYPE "gender" AS ENUM ('male', 'female', 'undefined');

-- Ensure uuid function exists for both shadow and target DBs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "api_bank_accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "developer_id" UUID NOT NULL,
    "bank_account_number" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "bank_account_name" TEXT NOT NULL,
    "sub_account_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "mode" TEXT NOT NULL DEFAULT 'test',

    CONSTRAINT "api_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_campaign_reports" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "api_campaign_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "developer_id" UUID NOT NULL,
    "api_key_id" UUID,
    "resolution_notes" TEXT,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "api_campaign_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_campaigns" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "developer_id" UUID NOT NULL,
    "api_key_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "goal_amount" DECIMAL NOT NULL,
    "raised_amount" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL DEFAULT 'active',
    "payout_mode" TEXT NOT NULL,
    "deadline" TIMESTAMPTZ(6),
    "bank_account_number" TEXT NOT NULL,
    "bank_code" TEXT NOT NULL,
    "bank_account_name" TEXT NOT NULL,
    "sub_account_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "mode" TEXT NOT NULL DEFAULT 'test',
    "bank_account_id" UUID,

    CONSTRAINT "api_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_donations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "api_campaign_id" UUID NOT NULL,
    "amount" DECIMAL NOT NULL,
    "tip_amount" DECIMAL NOT NULL DEFAULT 0,
    "donor_name" TEXT NOT NULL,
    "donor_email" TEXT NOT NULL,
    "message" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paystack_reference" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),
    "mode" TEXT NOT NULL DEFAULT 'live',

    CONSTRAINT "api_donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_request_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "api_key_id" UUID,
    "user_id" UUID,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "mode" TEXT,
    "status_code" INTEGER NOT NULL,
    "error_code" TEXT,
    "ip_address" TEXT,
    "response_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "api_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_webhook_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status_code" INTEGER,
    "response_body" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT,
    "account_number" TEXT,
    "bank_name" TEXT,
    "account_name" TEXT,
    "profile_photo" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_blocked" BOOLEAN,
    "sub_account_code" TEXT,
    "bio" TEXT,
    "solana_wallet" TEXT,
    "twitter_url" TEXT,
    "facebook_url" TEXT,
    "instagram_url" TEXT,
    "linkedin_url" TEXT,
    "crypto_wallets" JSONB,
    "account_type" TEXT,
    "is_verified" BOOLEAN DEFAULT false,
    "gender" TEXT,
    "website" TEXT,
    "referral_code" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "username" TEXT,
    "location" TEXT,
    "email" TEXT,
    "onboarding_completed" BOOLEAN DEFAULT false,
    "full_name" TEXT,
    "total_points" INTEGER DEFAULT 0,
    "current_tier" TEXT DEFAULT 'Tier 1',
    "Total Engagements" INTEGER,
    "eiza_balance" DECIMAL,
    "total_eiza_earned" DECIMAL,
    "upvotes_received" INTEGER,
    "content_quality_score" DECIMAL,
    "spam_flags" SMALLINT,
    "login_streak" SMALLINT,
    "last_login_date" DATE,
    "weekly_streak_count" SMALLINT DEFAULT 0,
    "monthly_streak_count" SMALLINT DEFAULT 0,
    "email_verified" TIMESTAMP(3),
    "password" TEXT,
    "last_login_user_agent" TEXT,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "otpCode" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referral_code" TEXT,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_otp_sent_at" TIMESTAMPTZ(6),

    CONSTRAINT "pending_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "causes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "goal" DECIMAL NOT NULL,
    "raised" DECIMAL DEFAULT 0,
    "status" TEXT DEFAULT 'pending',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "image" TEXT,
    "shared" DECIMAL DEFAULT 0,
    "days_active" INTEGER,
    "video_links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "multimedia" JSONB,
    "trust_score" JSONB DEFAULT '{"impact": "B+", "readability": "A", "transparency": "High"}',
    "verified_status" TEXT DEFAULT 'pending',
    "summary" TEXT,
    "location" TEXT,
    "faqs" JSONB DEFAULT '[]',
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),

    CONSTRAINT "causes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "cause_id" UUID NOT NULL,
    "user_id" UUID,
    "amount" DECIMAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "message" TEXT,
    "is_anonymous" BOOLEAN DEFAULT false,
    "status" TEXT DEFAULT 'completed',
    "receipt_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "tip_amount" DECIMAL DEFAULT 0,
    "paystack_reference" VARCHAR,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_follows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cause_id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cause_edit_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cause_edit_id" UUID NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cause_edit_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cause_edits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "original_cause_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "goal" INTEGER NOT NULL,
    "image" TEXT,
    "multimedia" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "video_links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "days_active" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "location" TEXT,
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),

    CONSTRAINT "cause_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cause_sections" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cause_id" UUID,
    "heading" TEXT,
    "description" TEXT,

    CONSTRAINT "sub-headings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cause_shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "cause_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cause_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "cause_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_edited" BOOLEAN DEFAULT false,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crypto_donations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "cause_id" UUID NOT NULL,
    "user_id" UUID,
    "amount_in_naira" DECIMAL NOT NULL,
    "amount_in_crypto" DECIMAL NOT NULL,
    "status" TEXT NOT NULL,
    "tx_hash" TEXT,
    "donor_wallet_address" TEXT,
    "recipient_address" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "tx_signature" TEXT NOT NULL,

    CONSTRAINT "crypto_donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_donations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matching_pool_id" UUID NOT NULL,
    "original_donation_id" UUID,
    "original_donation_type" TEXT NOT NULL,
    "original_amount" DECIMAL(15,2) NOT NULL,
    "matched_amount" DECIMAL(15,2) NOT NULL,
    "cause_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matching_donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_pool_causes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "matching_pool_id" UUID NOT NULL,
    "cause_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matching_pool_causes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_pools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "matching_ratio" DECIMAL(5,2) NOT NULL DEFAULT 0.2,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "matching_pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pledges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cause_id" UUID NOT NULL,
    "user_id" UUID,
    "token" TEXT,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT DEFAULT 'NGN',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT,
    "reminder_date" DATE NOT NULL,
    "status" TEXT DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paystack_authorization_code" TEXT,
    "authorization_email" TEXT,
    "first_transaction_reference" TEXT,
    "paystack_payment_status" TEXT,
    "scheduled_charge_reference" TEXT,
    "last_charge_error" TEXT,
    "charge_attempted_at" TIMESTAMPTZ(6),

    CONSTRAINT "pledges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "cause_id" UUID,
    "paystack_subscription_code" TEXT NOT NULL,
    "paystack_email_token" TEXT,
    "amount" DECIMAL NOT NULL,
    "interval" TEXT NOT NULL,
    "status" TEXT DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT,
    "name" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "country_id" BIGINT,
    "country_code" TEXT,
    "country_name" TEXT,
    "state_code" TEXT,
    "type" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" BIGINT NOT NULL,
    "name" TEXT,
    "state_id" BIGINT,
    "state_code" TEXT,
    "state_name" TEXT,
    "country_id" BIGINT,
    "country_code" TEXT,
    "country_name" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "wikiDataId" TEXT,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "goal" INTEGER NOT NULL,
    "raised" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "image" TEXT,
    "multimedia" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shared" INTEGER NOT NULL DEFAULT 0,
    "days_active" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "video_links" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "petitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petition_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "petition_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" UUID,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "petition_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petition_edit_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "petition_edit_id" UUID NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "petition_edit_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petition_edits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "original_petition_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "goal" INTEGER NOT NULL,
    "image" TEXT,
    "multimedia" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "video_links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "days_active" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "petition_edits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "petition_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "petition_id" UUID NOT NULL,
    "heading" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "petition_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "petition_id" UUID NOT NULL,
    "user_id" UUID,
    "amount" DECIMAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "receipt_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "balance" DECIMAL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_streaks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "weekly_streak" INTEGER DEFAULT 0,
    "is_monthly_active" BOOLEAN DEFAULT false,
    "last_active_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "amount" DECIMAL NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "event_id" UUID,
    "status" TEXT DEFAULT 'completed',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eiza_transactions" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_type" VARCHAR DEFAULT '',
    "amount" DECIMAL NOT NULL DEFAULT 0,
    "transaction_signature" VARCHAR,
    "metadata" JSONB,
    "user_id" UUID NOT NULL,

    CONSTRAINT "eiza_transactions_pkey" PRIMARY KEY ("id","user_id")
);

-- CreateTable
CREATE TABLE "kyc_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "verification_notes" TEXT,
    "full_name" TEXT,
    "dob" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referrer_id" UUID NOT NULL,
    "referee_id" UUID,
    "referee_email" TEXT NOT NULL,
    "registered" BOOLEAN DEFAULT false,
    "reward" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT timezone('utc'::text, now()),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals_v1" (
    "id_v1" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referrer_id_v1" UUID,
    "referee_id_v1" UUID,
    "referee_email_v1" TEXT NOT NULL,
    "registered_v1" BOOLEAN DEFAULT false,
    "reward_v1" TEXT,
    "utm_source_v1" TEXT,
    "utm_medium_v1" TEXT,
    "utm_campaign_v1" TEXT,
    "ip_address_v1" TEXT,
    "user_agent_v1" TEXT,
    "created_at_v1" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "kyc_verified_v1" BOOLEAN DEFAULT false,
    "rewarded_at_v1" TIMESTAMP(6),
    "reward_status_v1" TEXT DEFAULT 'PENDING',

    CONSTRAINT "referrals_v1_pkey" PRIMARY KEY ("id_v1")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action" TEXT NOT NULL,
    "admin_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_urls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "short_code" VARCHAR(10) NOT NULL,
    "entity_id" UUID NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "original_url" TEXT NOT NULL,
    "clicks" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub-description" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "sub_heading_id" BIGINT,

    CONSTRAINT "sub-description_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_api_campaign_reports_api_campaign_id" ON "api_campaign_reports"("api_campaign_id");

-- CreateIndex
CREATE INDEX "idx_api_campaign_reports_developer_id" ON "api_campaign_reports"("developer_id");

-- CreateIndex
CREATE INDEX "idx_api_campaign_reports_status" ON "api_campaign_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "api_donations_paystack_reference_key" ON "api_donations"("paystack_reference");

-- CreateIndex
CREATE INDEX "idx_api_donations_campaign_mode" ON "api_donations"("api_campaign_id", "mode");

-- CreateIndex
CREATE INDEX "idx_api_donations_mode" ON "api_donations"("mode");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_prefix_key" ON "api_keys"("key_prefix");

-- CreateIndex
CREATE INDEX "idx_api_request_logs_api_key_id" ON "api_request_logs"("api_key_id");

-- CreateIndex
CREATE INDEX "idx_api_request_logs_created_at" ON "api_request_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_api_request_logs_endpoint" ON "api_request_logs"("endpoint");

-- CreateIndex
CREATE INDEX "idx_api_webhook_logs_webhook_id" ON "api_webhook_logs"("webhook_id");

-- CreateIndex
CREATE INDEX "idx_api_webhooks_user_id" ON "api_webhooks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_referral_code_key" ON "profiles"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "idx_profiles_is_blocked" ON "profiles"("is_blocked");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_email_key" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "pending_registrations_email_key" ON "pending_registrations"("email");

-- CreateIndex
CREATE INDEX "idx_roles_user_id" ON "roles"("user_id");

-- CreateIndex
CREATE INDEX "idx_causes_days_active" ON "causes"("days_active");

-- CreateIndex
CREATE INDEX "idx_causes_status" ON "causes"("status");

-- CreateIndex
CREATE INDEX "idx_causes_user_id" ON "causes"("user_id");

-- CreateIndex
CREATE INDEX "idx_causes_video_links" ON "causes" USING GIN ("video_links");

-- CreateIndex
CREATE UNIQUE INDEX "donations_unique" ON "donations"("paystack_reference");

-- CreateIndex
CREATE INDEX "idx_donations_cause_id" ON "donations"("cause_id");

-- CreateIndex
CREATE INDEX "idx_donations_user_id" ON "donations"("user_id");

-- CreateIndex
CREATE INDEX "idx_campaign_follows_cause_id" ON "campaign_follows"("cause_id");

-- CreateIndex
CREATE INDEX "idx_campaign_follows_email" ON "campaign_follows"("email");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_follows_cause_id_email_key" ON "campaign_follows"("cause_id", "email");

-- CreateIndex
CREATE INDEX "idx_cause_edits_created_at" ON "cause_edits"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_cause_edits_original_id" ON "cause_edits"("original_cause_id");

-- CreateIndex
CREATE INDEX "idx_cause_edits_status" ON "cause_edits"("status");

-- CreateIndex
CREATE INDEX "idx_cause_edits_user_id" ON "cause_edits"("user_id");

-- CreateIndex
CREATE INDEX "idx_cause_shares_cause_id" ON "cause_shares"("cause_id");

-- CreateIndex
CREATE INDEX "idx_cause_shares_user_id" ON "cause_shares"("user_id");

-- CreateIndex
CREATE INDEX "idx_comments_cause_id" ON "comments"("cause_id");

-- CreateIndex
CREATE INDEX "idx_comments_parent_id" ON "comments"("parent_id");

-- CreateIndex
CREATE INDEX "idx_comments_user_id" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "idx_crypto_donations_cause_id" ON "crypto_donations"("cause_id");

-- CreateIndex
CREATE INDEX "idx_crypto_donations_created_at" ON "crypto_donations"("created_at");

-- CreateIndex
CREATE INDEX "idx_crypto_donations_network" ON "crypto_donations"("network");

-- CreateIndex
CREATE INDEX "idx_crypto_donations_tx_signature" ON "crypto_donations"("tx_signature");

-- CreateIndex
CREATE INDEX "idx_crypto_donations_user_id" ON "crypto_donations"("user_id");

-- CreateIndex
CREATE INDEX "idx_matching_donations_cause_id" ON "matching_donations"("cause_id");

-- CreateIndex
CREATE INDEX "idx_matching_donations_created_at" ON "matching_donations"("created_at");

-- CreateIndex
CREATE INDEX "idx_matching_donations_pool_id" ON "matching_donations"("matching_pool_id");

-- CreateIndex
CREATE INDEX "idx_matching_pool_causes_cause_id" ON "matching_pool_causes"("cause_id");

-- CreateIndex
CREATE INDEX "idx_matching_pool_causes_pool_id" ON "matching_pool_causes"("matching_pool_id");

-- CreateIndex
CREATE UNIQUE INDEX "matching_pool_causes_unique" ON "matching_pool_causes"("matching_pool_id", "cause_id");

-- CreateIndex
CREATE INDEX "idx_matching_pools_active" ON "matching_pools"("is_active", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "pledges_token_key" ON "pledges"("token");

-- CreateIndex
CREATE INDEX "idx_pledges_cause_id" ON "pledges"("cause_id");

-- CreateIndex
CREATE INDEX "idx_pledges_email" ON "pledges"("email");

-- CreateIndex
CREATE INDEX "idx_pledges_reminder_date" ON "pledges"("reminder_date");

-- CreateIndex
CREATE INDEX "idx_subscriptions_user_id" ON "subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "countries_country_key" ON "countries"("country");

-- CreateIndex
CREATE INDEX "idx_petitions_category" ON "petitions"("category");

-- CreateIndex
CREATE INDEX "idx_petitions_created_at" ON "petitions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_petitions_status" ON "petitions"("status");

-- CreateIndex
CREATE INDEX "idx_petitions_user_id" ON "petitions"("user_id");

-- CreateIndex
CREATE INDEX "idx_petitions_video_links" ON "petitions" USING GIN ("video_links");

-- CreateIndex
CREATE INDEX "idx_petition_comments_created" ON "petition_comments"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_petition_comments_parent" ON "petition_comments"("parent_id");

-- CreateIndex
CREATE INDEX "idx_petition_comments_petition" ON "petition_comments"("petition_id");

-- CreateIndex
CREATE INDEX "idx_petition_edits_created_at" ON "petition_edits"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_petition_edits_original_id" ON "petition_edits"("original_petition_id");

-- CreateIndex
CREATE INDEX "idx_petition_edits_status" ON "petition_edits"("status");

-- CreateIndex
CREATE INDEX "idx_petition_edits_user_id" ON "petition_edits"("user_id");

-- CreateIndex
CREATE INDEX "idx_petition_sections_petition_id" ON "petition_sections"("petition_id");

-- CreateIndex
CREATE INDEX "idx_signatures_created_at" ON "signatures"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_signatures_petition_id" ON "signatures"("petition_id");

-- CreateIndex
CREATE INDEX "idx_signatures_user_id" ON "signatures"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_signature_per_petition_user" ON "signatures"("petition_id", "email", "name");

-- CreateIndex
CREATE UNIQUE INDEX "user_wallets_user_id_key" ON "user_wallets"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_wallets_user_id" ON "user_wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_streaks_user_id_key" ON "user_streaks"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_streaks_user_id" ON "user_streaks"("user_id");

-- CreateIndex
CREATE INDEX "idx_reward_transactions_created_at" ON "reward_transactions"("created_at");

-- CreateIndex
CREATE INDEX "idx_reward_transactions_user_id" ON "reward_transactions"("user_id");

-- CreateIndex
CREATE INDEX "kyc_verifications_status_idx" ON "kyc_verifications"("status");

-- CreateIndex
CREATE INDEX "idx_events_created_at" ON "events"("created_at");

-- CreateIndex
CREATE INDEX "idx_events_type" ON "events"("event_type");

-- CreateIndex
CREATE INDEX "idx_events_user_id" ON "events"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_referral_email_per_referrer" ON "referrals"("referrer_id", "referee_email");

-- CreateIndex
CREATE INDEX "idx_referrals_v1_referee_email" ON "referrals_v1"("referee_email_v1");

-- CreateIndex
CREATE INDEX "idx_referrals_v1_referrer" ON "referrals_v1"("referrer_id_v1");

-- CreateIndex
CREATE INDEX "idx_referrals_v1_utm_source" ON "referrals_v1"("utm_source_v1");

-- CreateIndex
CREATE UNIQUE INDEX "short_urls_short_code_key" ON "short_urls"("short_code");

-- CreateIndex
CREATE INDEX "idx_short_urls_code" ON "short_urls"("short_code");

-- CreateIndex
CREATE INDEX "idx_short_urls_entity" ON "short_urls"("entity_id", "entity_type");

-- AddForeignKey
ALTER TABLE "api_campaign_reports" ADD CONSTRAINT "api_campaign_reports_api_campaign_id_fkey" FOREIGN KEY ("api_campaign_id") REFERENCES "api_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_webhook_logs" ADD CONSTRAINT "api_webhook_logs_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "api_webhooks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "causes" ADD CONSTRAINT "causes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_cause_id_fkey" FOREIGN KEY ("cause_id") REFERENCES "causes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_follows" ADD CONSTRAINT "campaign_follows_cause_id_fkey" FOREIGN KEY ("cause_id") REFERENCES "causes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_follows" ADD CONSTRAINT "campaign_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cause_edit_sections" ADD CONSTRAINT "cause_edit_sections_cause_edit_id_fkey" FOREIGN KEY ("cause_edit_id") REFERENCES "cause_edits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cause_edits" ADD CONSTRAINT "cause_edits_original_cause_id_fkey" FOREIGN KEY ("original_cause_id") REFERENCES "causes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cause_edits" ADD CONSTRAINT "cause_edits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cause_sections" ADD CONSTRAINT "cause_sections_cause_id_fkey" FOREIGN KEY ("cause_id") REFERENCES "causes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cause_shares" ADD CONSTRAINT "cause_shares_cause_id_fkey" FOREIGN KEY ("cause_id") REFERENCES "causes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cause_shares" ADD CONSTRAINT "cause_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_cause_id_fkey" FOREIGN KEY ("cause_id") REFERENCES "causes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_donations" ADD CONSTRAINT "crypto_donations_cause_id_fkey" FOREIGN KEY ("cause_id") REFERENCES "causes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_donations" ADD CONSTRAINT "crypto_donations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petitions" ADD CONSTRAINT "petitions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petition_comments" ADD CONSTRAINT "petition_comments_petition_id_fkey" FOREIGN KEY ("petition_id") REFERENCES "petitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petition_comments" ADD CONSTRAINT "petition_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petition_edit_sections" ADD CONSTRAINT "petition_edit_sections_petition_edit_id_fkey" FOREIGN KEY ("petition_edit_id") REFERENCES "petition_edits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petition_edits" ADD CONSTRAINT "petition_edits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "petition_sections" ADD CONSTRAINT "petition_sections_petition_id_fkey" FOREIGN KEY ("petition_id") REFERENCES "petitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_petition_id_fkey" FOREIGN KEY ("petition_id") REFERENCES "petitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
