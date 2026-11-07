-- CreateTable
CREATE TABLE "public"."admin_audit_entries" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_payment_attempts" (
    "id" UUID NOT NULL,
    "reference" TEXT,
    "provider" TEXT NOT NULL,
    "cause_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "service_fee" DECIMAL(18,2) NOT NULL,
    "provider_fee" DECIMAL(18,2) NOT NULL,
    "tip" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'initializing',
    "donation_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_support_tickets" (
    "id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requester_name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_by" UUID NOT NULL,
    "assignee_id" UUID,
    "first_responded_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admin_work_assignments" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "assignee_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_work_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."device_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" VARCHAR(20) NOT NULL DEFAULT 'android',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_daily_activity" (
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "last_seen" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_activity_pkey" PRIMARY KEY ("user_id","day")
);

-- CreateTable
CREATE TABLE "public"."user_saved_cards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "authorization_code" VARCHAR NOT NULL,
    "card_type" VARCHAR,
    "last4" VARCHAR(4) NOT NULL,
    "exp_month" VARCHAR(2) NOT NULL,
    "exp_year" VARCHAR(4) NOT NULL,
    "bin" VARCHAR(6),
    "bank" VARCHAR,
    "brand" VARCHAR,
    "signature" VARCHAR,
    "email" VARCHAR,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_entries_actor_id_created_at_idx" ON "public"."admin_audit_entries"("actor_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "admin_audit_entries_kind_target_id_idx" ON "public"."admin_audit_entries"("kind" ASC, "target_id" ASC);

-- CreateIndex
CREATE INDEX "admin_payment_attempts_created_at_status_idx" ON "public"."admin_payment_attempts"("created_at" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_payment_attempts_donation_id_key" ON "public"."admin_payment_attempts"("donation_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_payment_attempts_reference_key" ON "public"."admin_payment_attempts"("reference" ASC);

-- CreateIndex
CREATE INDEX "admin_support_tickets_assignee_id_status_idx" ON "public"."admin_support_tickets"("assignee_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "admin_support_tickets_status_created_at_idx" ON "public"."admin_support_tickets"("status" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "admin_work_assignments_assignee_id_idx" ON "public"."admin_work_assignments"("assignee_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_work_assignments_kind_target_id_key" ON "public"."admin_work_assignments"("kind" ASC, "target_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "public"."device_tokens"("token" ASC);

-- CreateIndex
CREATE INDEX "idx_device_tokens_user" ON "public"."device_tokens"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_notifications_user_created" ON "public"."notifications"("user_id" ASC, "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notifications_user_read" ON "public"."notifications"("user_id" ASC, "is_read" ASC);

-- CreateIndex
CREATE INDEX "user_daily_activity_day_idx" ON "public"."user_daily_activity"("day" ASC);

-- CreateIndex
CREATE INDEX "idx_user_saved_cards_user_id" ON "public"."user_saved_cards"("user_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_saved_cards" ADD CONSTRAINT "user_saved_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
