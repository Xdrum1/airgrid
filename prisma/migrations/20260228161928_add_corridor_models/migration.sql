-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "corridorIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Corridor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "operatorId" TEXT,
    "startPointLat" DOUBLE PRECISION NOT NULL,
    "startPointLng" DOUBLE PRECISION NOT NULL,
    "startPointLabel" TEXT NOT NULL,
    "endPointLat" DOUBLE PRECISION NOT NULL,
    "endPointLng" DOUBLE PRECISION NOT NULL,
    "endPointLabel" TEXT NOT NULL,
    "waypoints" JSONB,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "estimatedFlightMinutes" INTEGER NOT NULL,
    "maxAltitudeFt" INTEGER NOT NULL,
    "altitudeMinFt" INTEGER,
    "faaAuthNumber" TEXT,
    "effectiveDate" TEXT,
    "expirationDate" TEXT,
    "clearedOperators" TEXT[],
    "notes" TEXT,
    "sourceUrl" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Corridor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorridorStatusHistory" (
    "id" TEXT NOT NULL,
    "corridorId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT,
    "sourceUrl" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorridorStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Corridor_cityId_idx" ON "Corridor"("cityId");

-- CreateIndex
CREATE INDEX "Corridor_status_idx" ON "Corridor"("status");

-- CreateIndex
CREATE INDEX "Corridor_operatorId_idx" ON "Corridor"("operatorId");

-- CreateIndex
CREATE INDEX "CorridorStatusHistory_corridorId_changedAt_idx" ON "CorridorStatusHistory"("corridorId", "changedAt");

-- AddForeignKey
ALTER TABLE "CorridorStatusHistory" ADD CONSTRAINT "CorridorStatusHistory_corridorId_fkey" FOREIGN KEY ("corridorId") REFERENCES "Corridor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
