-- AlterTable
ALTER TABLE "flowAsset" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileType" TEXT,
ADD COLUMN     "fileUrl" TEXT;

-- AlterTable
ALTER TABLE "flowCanvas" ADD COLUMN     "thumbnailUrl" TEXT;

-- AlterTable
ALTER TABLE "flowProject" ADD COLUMN     "logoUrl" TEXT;
