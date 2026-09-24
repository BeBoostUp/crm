-- CreateEnum
CREATE TYPE "FlowRole" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "FlowCanvasType" AS ENUM ('JOURNEY', 'CAMPAIGN', 'MIND');

-- CreateEnum
CREATE TYPE "FlowAssetKind" AS ENUM ('AD', 'LANDING', 'EMAIL', 'RESOURCE');

-- CreateTable
CREATE TABLE "flowProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "companyId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowMember" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "FlowRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flowMember_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "flowCanvas" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "FlowCanvasType" NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT,
    "document" JSONB NOT NULL,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowCanvas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowGuestLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "flowGuestLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "FlowAssetKind" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowChecklist" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flowProject_companyId_idx" ON "flowProject"("companyId");

-- CreateIndex
CREATE INDEX "flowMember_userId_idx" ON "flowMember"("userId");

-- CreateIndex
CREATE INDEX "flowCanvas_projectId_createdAt_idx" ON "flowCanvas"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "flowGuestLink_tokenHash_key" ON "flowGuestLink"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "flowGuestLink_one_active_per_project" ON "flowGuestLink"("projectId") WHERE ("revokedAt" IS NULL);

-- CreateIndex
CREATE INDEX "flowAsset_projectId_createdAt_idx" ON "flowAsset"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "flowChecklist_projectId_createdAt_idx" ON "flowChecklist"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "flowChecklistItem_checklistId_createdAt_idx" ON "flowChecklistItem"("checklistId", "createdAt");

-- AddForeignKey
ALTER TABLE "flowProject" ADD CONSTRAINT "flowProject_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowProject" ADD CONSTRAINT "flowProject_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowMember" ADD CONSTRAINT "flowMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowMember" ADD CONSTRAINT "flowMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowCanvas" ADD CONSTRAINT "flowCanvas_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowGuestLink" ADD CONSTRAINT "flowGuestLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowAsset" ADD CONSTRAINT "flowAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowChecklist" ADD CONSTRAINT "flowChecklist_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowChecklistItem" ADD CONSTRAINT "flowChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "flowChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
