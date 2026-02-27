-- CreateTable
CREATE TABLE "ScoringOverride" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "sourceUrl" TEXT,
    "confidence" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoringOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScoringOverride_cityId_field_idx" ON "ScoringOverride"("cityId", "field");
