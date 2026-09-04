-- AlterTable
ALTER TABLE "api_bank_accounts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "api_campaign_reports" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "api_campaigns" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "api_donations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "api_request_logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "causes" ADD COLUMN     "compliance_paused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "compliance_paused_at" TIMESTAMPTZ(6),
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "crypto_donations" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "donations" ADD COLUMN     "referrer_id" UUID,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- AlterTable
ALTER TABLE "pending_registrations" ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "user_agent" TEXT,
ADD COLUMN     "utm_campaign" TEXT,
ADD COLUMN     "utm_medium" TEXT,
ADD COLUMN     "utm_source" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "flutterwave_sub_account_id" TEXT;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- CreateTable
CREATE TABLE "campaign_proof_requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cause_id" UUID NOT NULL,
    "milestone" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "crossed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMPTZ(6) NOT NULL,
    "last_reminder_at" TIMESTAMPTZ(6),
    "submitted_update_id" UUID,
    "satisfied_at" TIMESTAMPTZ(6),

    CONSTRAINT "campaign_proof_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_proof_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cause_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "milestone" INTEGER,
    "description" TEXT NOT NULL,
    "media" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_proof_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donor_referral_attributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referrer_id" UUID NOT NULL,
    "donation_id" UUID NOT NULL,
    "cause_id" UUID NOT NULL,
    "donor_email" TEXT NOT NULL,
    "donor_user_id" UUID,
    "referral_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donor_referral_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_proof_req_status_deadline" ON "campaign_proof_requirements"("status", "deadline");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_proof_req_cause_milestone" ON "campaign_proof_requirements"("cause_id", "milestone");

-- CreateIndex
CREATE INDEX "idx_proof_updates_cause_status" ON "campaign_proof_updates"("cause_id", "status");

-- CreateIndex
CREATE INDEX "idx_proof_updates_status_created" ON "campaign_proof_updates"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_bookmarks_user_id" ON "bookmarks"("user_id");

-- CreateIndex
CREATE INDEX "idx_bookmarks_target" ON "bookmarks"("target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_user_id_target_type_target_id_key" ON "bookmarks"("user_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_saved_searches_user_id" ON "saved_searches"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "donor_referral_attributions_donation_id_key" ON "donor_referral_attributions"("donation_id");

-- CreateIndex
CREATE INDEX "idx_dra_referrer_status" ON "donor_referral_attributions"("referrer_id", "status");

-- CreateIndex
CREATE INDEX "idx_dra_cause_id" ON "donor_referral_attributions"("cause_id");

-- CreateIndex
CREATE INDEX "idx_dra_donor_email" ON "donor_referral_attributions"("donor_email");

-- CreateIndex
CREATE INDEX "idx_donations_referrer_id" ON "donations"("referrer_id");

-- AddForeignKey
ALTER TABLE "campaign_proof_requirements" ADD CONSTRAINT "campaign_proof_requirements_cause_id_fkey" FOREIGN KEY ("cause_id") REFERENCES "causes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_proof_updates" ADD CONSTRAINT "campaign_proof_updates_cause_id_fkey" FOREIGN KEY ("cause_id") REFERENCES "causes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_proof_updates" ADD CONSTRAINT "campaign_proof_updates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
