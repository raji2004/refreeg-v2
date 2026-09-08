-- AlterTable
ALTER TABLE "causes" ADD COLUMN     "reconstructed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reconstruction_note" TEXT;
