-- Receipt IDs read as RC-8001 and up, including rows that already exist.
CREATE SEQUENCE "public"."campaign_proof_updates_receipt_no_seq" START 8001;

-- AlterTable
ALTER TABLE "public"."campaign_proof_updates"
    ADD COLUMN "receipt_no" INTEGER NOT NULL DEFAULT nextval('"public"."campaign_proof_updates_receipt_no_seq"'),
    ADD COLUMN "receipt_title" TEXT,
    ADD COLUMN "vendor" TEXT,
    ADD COLUMN "receipt_date" DATE,
    ADD COLUMN "amount" DECIMAL(18,2),
    ADD COLUMN "invoice_number" TEXT,
    ADD COLUMN "read_vendor" TEXT,
    ADD COLUMN "read_date" DATE,
    ADD COLUMN "read_amount" DECIMAL(18,2),
    ADD COLUMN "read_invoice_number" TEXT,
    ADD COLUMN "verified_amount" DECIMAL(18,2),
    ADD COLUMN "info_request_reason" TEXT,
    ADD COLUMN "info_request_message" TEXT,
    ADD COLUMN "info_reply_by" TIMESTAMPTZ(6),
    ADD COLUMN "info_requested_at" TIMESTAMPTZ(6);

ALTER SEQUENCE "public"."campaign_proof_updates_receipt_no_seq" OWNED BY "public"."campaign_proof_updates"."receipt_no";

-- CreateIndex
CREATE UNIQUE INDEX "campaign_proof_updates_receipt_no_key" ON "public"."campaign_proof_updates"("receipt_no");
