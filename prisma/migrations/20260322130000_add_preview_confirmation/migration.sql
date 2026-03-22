-- CreateEnum
CREATE TYPE "InterestProfileStatus" AS ENUM ('pending_preview', 'active');

-- CreateEnum
CREATE TYPE "PreviewDigestStatus" AS ENUM ('generating', 'failed', 'ready');

-- AlterTable
ALTER TABLE "InterestProfile"
ADD COLUMN "status" "InterestProfileStatus" NOT NULL DEFAULT 'active';

-- CreateTable
CREATE TABLE "PreviewDigest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generationToken" TEXT NOT NULL,
    "interestTextSnapshot" TEXT NOT NULL,
    "status" "PreviewDigestStatus" NOT NULL,
    "title" TEXT,
    "intro" TEXT,
    "contentJson" JSONB,
    "readingTime" INTEGER,
    "providerName" TEXT,
    "providerModel" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreviewDigest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreviewDigest_userId_key" ON "PreviewDigest"("userId");

-- AddForeignKey
ALTER TABLE "PreviewDigest" ADD CONSTRAINT "PreviewDigest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
