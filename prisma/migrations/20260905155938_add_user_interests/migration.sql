-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "interest_location" TEXT,
ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[];
