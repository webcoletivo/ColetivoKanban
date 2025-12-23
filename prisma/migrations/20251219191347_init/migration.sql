-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CARD_CREATED', 'CARD_MOVED', 'CARD_UPDATED', 'CARD_ARCHIVED', 'DUE_SET', 'DUE_REMOVED', 'DUE_COMPLETED', 'DUE_UNCOMPLETED', 'LABEL_ADDED', 'LABEL_REMOVED', 'CHECKLIST_CREATED', 'CHECKLIST_DELETED', 'CHECKLIST_ITEM_ADDED', 'CHECKLIST_ITEM_COMPLETED', 'CHECKLIST_ITEM_UNCOMPLETED', 'CHECKLIST_ITEM_DELETED', 'ATTACHMENT_ADDED', 'ATTACHMENT_REMOVED', 'COMMENT_ADDED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardMember" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "BoardMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Column" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "boardId" TEXT NOT NULL,

    CONSTRAINT "Column_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "position" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "boardId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boardId" TEXT NOT NULL,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardLabel" (
    "cardId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "CardLabel_pkey" PRIMARY KEY ("cardId","labelId")
);

-- CreateTable
CREATE TABLE "Checklist" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cardId" TEXT NOT NULL,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "position" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "checklistId" TEXT NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "cardId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CardComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardActivity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cardId" TEXT NOT NULL,
    "actorId" TEXT,

    CONSTRAINT "CardActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "boardId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedById" TEXT,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Board_createdById_idx" ON "Board"("createdById");

-- CreateIndex
CREATE INDEX "BoardMember_boardId_idx" ON "BoardMember"("boardId");

-- CreateIndex
CREATE INDEX "BoardMember_userId_idx" ON "BoardMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardMember_boardId_userId_key" ON "BoardMember"("boardId", "userId");

-- CreateIndex
CREATE INDEX "Column_boardId_idx" ON "Column"("boardId");

-- CreateIndex
CREATE INDEX "Card_boardId_idx" ON "Card"("boardId");

-- CreateIndex
CREATE INDEX "Card_columnId_idx" ON "Card"("columnId");

-- CreateIndex
CREATE INDEX "Card_createdById_idx" ON "Card"("createdById");

-- CreateIndex
CREATE INDEX "Label_boardId_idx" ON "Label"("boardId");

-- CreateIndex
CREATE INDEX "Checklist_cardId_idx" ON "Checklist"("cardId");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistId_idx" ON "ChecklistItem"("checklistId");

-- CreateIndex
CREATE INDEX "Attachment_cardId_idx" ON "Attachment"("cardId");

-- CreateIndex
CREATE INDEX "CardComment_cardId_idx" ON "CardComment"("cardId");

-- CreateIndex
CREATE INDEX "CardComment_userId_idx" ON "CardComment"("userId");

-- CreateIndex
CREATE INDEX "CardActivity_cardId_idx" ON "CardActivity"("cardId");

-- CreateIndex
CREATE INDEX "CardActivity_actorId_idx" ON "CardActivity"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_boardId_idx" ON "Invitation"("boardId");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_tokenHash_idx" ON "Invitation"("tokenHash");

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardMember" ADD CONSTRAINT "BoardMember_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardMember" ADD CONSTRAINT "BoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Column" ADD CONSTRAINT "Column_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Label" ADD CONSTRAINT "Label_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardLabel" ADD CONSTRAINT "CardLabel_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardLabel" ADD CONSTRAINT "CardLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardComment" ADD CONSTRAINT "CardComment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardComment" ADD CONSTRAINT "CardComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardActivity" ADD CONSTRAINT "CardActivity_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardActivity" ADD CONSTRAINT "CardActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
