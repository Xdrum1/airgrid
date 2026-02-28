-- AlterTable
ALTER TABLE "ScoreSnapshot" ADD COLUMN     "triggeringEventId" TEXT;

-- CreateTable
CREATE TABLE "ClassificationResult" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "factorsJson" JSONB NOT NULL,
    "affectedCities" TEXT[],
    "confidence" TEXT NOT NULL,
    "rawResponse" JSONB NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassificationResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassificationResult_recordId_idx" ON "ClassificationResult"("recordId");

-- CreateIndex
CREATE INDEX "ClassificationResult_eventType_idx" ON "ClassificationResult"("eventType");

-- CreateIndex
CREATE INDEX "ClassificationResult_confidence_idx" ON "ClassificationResult"("confidence");
