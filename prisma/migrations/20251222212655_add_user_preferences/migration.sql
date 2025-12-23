-- CreateEnum
CREATE TYPE "AutomationType" AS ENUM ('MOVE_TO_COLUMN', 'COPY_TO_COLUMN', 'ADD_LABEL');

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "emailInvitesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColumnAutomation" (
    "id" TEXT NOT NULL,
    "type" "AutomationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "columnId" TEXT NOT NULL,

    CONSTRAINT "ColumnAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserPreferences_userId_idx" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "ColumnAutomation_columnId_idx" ON "ColumnAutomation"("columnId");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColumnAutomation" ADD CONSTRAINT "ColumnAutomation_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;
