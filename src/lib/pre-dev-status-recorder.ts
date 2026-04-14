/**
 * Pre-Dev Facility Status Recorder
 *
 * Compares the current static catalog (src/data/pre-development-facilities.ts)
 * against the most recent row in PreDevFacilityStatusHistory for each facility
 * and inserts a new history row when:
 *   - No history exists for the facility (first capture), OR
 *   - The catalog's current status differs from the most recent history row
 *
 * Called by the snapshot cron so facility milestones can be verified against
 * a real status timeline when `verify-predictions.ts` runs.
 */
import { PRE_DEVELOPMENT_FACILITIES } from "@/data/pre-development-facilities";
import { createLogger } from "@/lib/logger";

const logger = createLogger("pre-dev-status-recorder");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export interface RecorderResult {
  facilitiesChecked: number;
  transitionsRecorded: number;
  initialCaptures: number;
  errors: number;
}

export async function recordFacilityStatusSnapshot(): Promise<RecorderResult> {
  const prisma = await getPrisma();
  let transitionsRecorded = 0;
  let initialCaptures = 0;
  let errors = 0;

  for (const facility of PRE_DEVELOPMENT_FACILITIES) {
    try {
      const latest = await prisma.preDevFacilityStatusHistory.findFirst({
        where: { facilityId: facility.id },
        orderBy: { recordedAt: "desc" },
      });

      if (!latest) {
        await prisma.preDevFacilityStatusHistory.create({
          data: {
            facilityId: facility.id,
            marketId: facility.marketId ?? null,
            status: facility.status,
            note: "initial capture",
          },
        });
        initialCaptures++;
        continue;
      }

      if (latest.status !== facility.status) {
        await prisma.preDevFacilityStatusHistory.create({
          data: {
            facilityId: facility.id,
            marketId: facility.marketId ?? null,
            status: facility.status,
            note: `${latest.status} → ${facility.status}`,
          },
        });
        transitionsRecorded++;
      }
    } catch (err) {
      errors++;
      logger.error("Failed to record facility status", { facilityId: facility.id, err });
    }
  }

  return {
    facilitiesChecked: PRE_DEVELOPMENT_FACILITIES.length,
    transitionsRecorded,
    initialCaptures,
    errors,
  };
}
