-- AlterTable
ALTER TABLE "causes" ADD COLUMN     "paused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paused_at" TIMESTAMPTZ(6);
