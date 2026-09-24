-- CreateEnum
CREATE TYPE "FlowChatChannelKey" AS ENUM ('GENERAL', 'INTERNAL', 'CREATIVE', 'CLIENT');

-- AlterEnum
ALTER TYPE "FlowCanvasType" ADD VALUE 'EMAIL';

-- AlterTable
ALTER TABLE "flowChecklist" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "flowChecklistItem" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "flowGuestLink" ADD COLUMN     "canComment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "flowMember" ADD COLUMN     "permissions" JSONB;

-- CreateTable
CREATE TABLE "flowGuestComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "canvasId" TEXT,
    "nodeId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flowGuestComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowChatChannel" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" "FlowChatChannelKey" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flowChatChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowChatMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flowChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flowGuestComment_projectId_createdAt_idx" ON "flowGuestComment"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "flowChatChannel_projectId_key_key" ON "flowChatChannel"("projectId", "key");

-- CreateIndex
CREATE INDEX "flowChatMessage_channelId_createdAt_idx" ON "flowChatMessage"("channelId", "createdAt");

-- AddForeignKey
ALTER TABLE "flowGuestComment" ADD CONSTRAINT "flowGuestComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowChatChannel" ADD CONSTRAINT "flowChatChannel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowChatMessage" ADD CONSTRAINT "flowChatMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "flowChatChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowChatMessage" ADD CONSTRAINT "flowChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
