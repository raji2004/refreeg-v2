ALTER TABLE "pending_registrations"
  ADD COLUMN "account_type" TEXT NOT NULL DEFAULT 'individual',
  ADD COLUMN "organization_name" TEXT,
  ADD COLUMN "organization_phone" TEXT,
  ADD COLUMN "organization_address" TEXT,
  ADD COLUMN "organization_industry" TEXT;

CREATE TABLE "organizations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "admin_email" TEXT NOT NULL,
  "phone" TEXT,
  "address" TEXT,
  "industry" TEXT,
  "logo_url" TEXT,
  "preferences" JSONB NOT NULL DEFAULT '{}',
  "owner_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_invitations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "invited_by_id" UUID NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "organizations_owner_id_key" ON "organizations"("owner_id");
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");
CREATE UNIQUE INDEX "organization_invitations_token_key" ON "organization_invitations"("token");
CREATE INDEX "organization_invitations_organization_id_status_idx" ON "organization_invitations"("organization_id", "status");
CREATE INDEX "organization_invitations_email_idx" ON "organization_invitations"("email");

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_owner_id_fkey"
  FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_members"
  ADD CONSTRAINT "organization_members_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "organization_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_invitations"
  ADD CONSTRAINT "organization_invitations_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "organization_invitations_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "organizations" ("name", "slug", "admin_email", "phone", "owner_id")
SELECT
  COALESCE(NULLIF(TRIM("full_name"), ''), SPLIT_PART("email", '@', 1), 'Organisation'),
  COALESCE(NULLIF(REGEXP_REPLACE(LOWER(COALESCE("full_name", 'organisation')), '[^a-z0-9]+', '-', 'g'), ''), 'organisation') || '-' || SUBSTRING("id"::TEXT, 1, 8),
  COALESCE("email", ''),
  "phone",
  "id"
FROM "profiles"
WHERE "account_type" = 'organization'
ON CONFLICT ("owner_id") DO NOTHING;

INSERT INTO "organization_members" ("organization_id", "user_id", "role")
SELECT "id", "owner_id", 'owner'
FROM "organizations"
ON CONFLICT ("organization_id", "user_id") DO NOTHING;
