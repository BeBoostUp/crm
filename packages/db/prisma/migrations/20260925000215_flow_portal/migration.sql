-- CreateEnum
CREATE TYPE "FlowMilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'APPROVED');

-- CreateEnum
CREATE TYPE "FlowOnboardingKind" AS ENUM ('QUESTION', 'ASSET');

-- CreateEnum
CREATE TYPE "FlowTicketStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "flowMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "FlowMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "deliverables" JSONB NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowMetric" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "booked" INTEGER NOT NULL DEFAULT 0,
    "attended" INTEGER NOT NULL DEFAULT 0,
    "sales" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowOnboardingItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "FlowOnboardingKind" NOT NULL,
    "label" TEXT NOT NULL,
    "answer" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowOnboardingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowDecision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flowDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowTicket" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "author" TEXT NOT NULL,
    "status" "FlowTicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flowTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flowSecret" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flowSecret_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flowMilestone_projectId_position_idx" ON "flowMilestone"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "flowMetric_projectId_weekStart_key" ON "flowMetric"("projectId", "weekStart");

-- CreateIndex
CREATE INDEX "flowOnboardingItem_projectId_position_idx" ON "flowOnboardingItem"("projectId", "position");

-- CreateIndex
CREATE INDEX "flowDecision_projectId_decidedAt_idx" ON "flowDecision"("projectId", "decidedAt");

-- CreateIndex
CREATE INDEX "flowTicket_projectId_status_createdAt_idx" ON "flowTicket"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "flowSecret_projectId_idx" ON "flowSecret"("projectId");

-- AddForeignKey
ALTER TABLE "flowMilestone" ADD CONSTRAINT "flowMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowMetric" ADD CONSTRAINT "flowMetric_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowOnboardingItem" ADD CONSTRAINT "flowOnboardingItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowDecision" ADD CONSTRAINT "flowDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowTicket" ADD CONSTRAINT "flowTicket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flowSecret" ADD CONSTRAINT "flowSecret_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "flowProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
