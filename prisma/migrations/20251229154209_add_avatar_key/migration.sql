-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'CARD_MARKED_AS_TEMPLATE';
ALTER TYPE "ActivityType" ADD VALUE 'CARD_UNMARKED_AS_TEMPLATE';
ALTER TYPE "ActivityType" ADD VALUE 'CARD_CREATED_FROM_TEMPLATE';

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "templateSourceCardId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarKey" TEXT;
