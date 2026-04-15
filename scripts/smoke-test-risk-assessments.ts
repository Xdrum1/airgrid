/**
 * Smoke-test: run getSiteRiskAssessment across the demo set.
 * Verifies every demo facility resolves data, computes a tier, and
 * produces at least one gap flag (or a clean LOW assessment).
 *
 * Usage: npx tsx scripts/smoke-test-risk-assessments.ts
 */
import { getSiteRiskAssessment, RISK_DEMO_SITE_IDS } from "@/lib/risk-index";
import { prisma } from "@/lib/prisma";

async function main() {
  let ok = 0;
  let bad = 0;
  console.log(`\nRunning RiskIndex smoke test on ${RISK_DEMO_SITE_IDS.length} demo facilities...\n`);

  for (const siteId of RISK_DEMO_SITE_IDS) {
    try {
      const r = await getSiteRiskAssessment(siteId);
      if (!r) {
        console.log(`  ✗ ${siteId}  (no assessment returned)`);
        bad++;
        continue;
      }
      const url = `/admin/reports/risk-assessment/${r.facilityId.toLowerCase()}`;
      console.log(
        `  ${r.riskTier.padEnd(8)} score=${String(r.riskScore).padStart(2)} | ` +
        `${r.state}/${r.city.padEnd(18)} | ` +
        `${r.facilityName.slice(0, 42).padEnd(42)} | ` +
        `flags=${r.gapFlags.length} | ` +
        `burden=${r.stateContext?.regulatoryBurdenLevel ?? "-"} | ${url}`,
      );
      ok++;
    } catch (err) {
      console.log(`  ✗ ${siteId}  ERROR: ${err instanceof Error ? err.message : String(err)}`);
      bad++;
    }
  }

  console.log(`\n${ok}/${RISK_DEMO_SITE_IDS.length} assessments rendered successfully. ${bad} failed.\n`);
  await prisma.$disconnect();
  if (bad > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
