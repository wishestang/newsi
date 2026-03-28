-- AlterTable
ALTER TABLE "DailyDigest" ADD COLUMN "shareSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DailyDigest_shareSlug_key" ON "DailyDigest"("shareSlug");
