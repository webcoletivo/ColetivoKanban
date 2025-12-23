-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "coverColor" TEXT,
ADD COLUMN     "coverImageKey" TEXT,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "coverSize" TEXT DEFAULT 'strip',
ADD COLUMN     "coverType" TEXT DEFAULT 'none';
