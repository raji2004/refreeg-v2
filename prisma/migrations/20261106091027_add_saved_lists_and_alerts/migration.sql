/*
  Warnings:

  - You are about to drop the `bookmarks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "bookmarks" DROP CONSTRAINT "bookmarks_user_id_fkey";

-- DropTable
ALTER TABLE "bookmarks" RENAME TO "bookmarks_old";

-- CreateTable
CREATE TABLE "SavedList" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#0D1E16',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "list_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAlertPrefs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "closing_3d" BOOLEAN NOT NULL DEFAULT true,
    "reached_80pct" BOOLEAN NOT NULL DEFAULT true,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "weekly_digest" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAlertPrefs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_saved_lists_user_id" ON "SavedList"("user_id");

-- CreateIndex
CREATE INDEX "idx_saved_bookmarks_user_id" ON "Bookmark"("user_id");

-- CreateIndex
CREATE INDEX "idx_saved_bookmarks_list_id" ON "Bookmark"("list_id");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_user_id_target_id_target_type_key" ON "Bookmark"("user_id", "target_id", "target_type");

-- CreateIndex
CREATE UNIQUE INDEX "UserAlertPrefs_user_id_key" ON "UserAlertPrefs"("user_id");

-- AddForeignKey
ALTER TABLE "SavedList" ADD CONSTRAINT "SavedList_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "SavedList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAlertPrefs" ADD CONSTRAINT "UserAlertPrefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep existing bookmarks
INSERT INTO "Bookmark" ("id", "user_id", "target_type", "target_id", "created_at")
SELECT "id", "user_id", "target_type", "target_id", "created_at" FROM "bookmarks_old";

DROP TABLE "bookmarks_old";
