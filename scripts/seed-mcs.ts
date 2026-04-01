/**
 * MCS — Seed Market Context Store
 *
 * State context, regional clusters, and peer groups for all
 * 21+ tracked markets.
 *
 * Usage:
 *   npx tsx scripts/seed-mcs.ts
 *   npx tsx scripts/seed-mcs.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { CITIES } from "../src/data/seed";
import { calculateReadinessScore, getScoreTier } from "../src/lib/scoring";

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────
// State Context — legislative + enforcement posture
// ─────────────────────────────────────────────────────────

const STATE_CONTEXTS = [
  { code: "CA", name: "California", legislation: "enacted", enforcement: "strong", dot: "active", aamOffice: false, key: "CA SB 944 — Advanced Air Mobility Act (2024)", enfNote: "California is a heavily enforced state. Governor's Executive Order on AAM. SB 944 provides statewide framework.", dotNote: "Caltrans actively engaged in AAM infrastructure planning." },
  { code: "TX", name: "Texas", legislation: "enacted", enforcement: "limited", dot: "emerging", aamOffice: false, key: "TX HB 1735 — UAM enabling framework (2025)", enfNote: "Texas has limited enforcement per Rex. TxDOT does not mandate AC 150/5390-2D for private-use heliports. Federal grant-funded facilities only.", dotNote: "TxDOT beginning AAM engagement. Limited state-level enforcement structure." },
  { code: "FL", name: "Florida", legislation: "enacted", enforcement: "strong", dot: "active", aamOffice: false, key: "FL SB 1662 — AAM Infrastructure Standards (2025)", enfNote: "Florida is one of the most heavily enforced states per Rex. FDOT AAM Land Use Compatibility and Site Approval Guidebook (Sept 2024). SB 1662 further codifies.", dotNote: "FDOT actively engaged. Published AAM training program for local leaders (Woolpert partnership). Gold standard per Rex." },
  { code: "AZ", name: "Arizona", legislation: "actively_moving", enforcement: "moderate", dot: "active", aamOffice: true, key: "AZ SB 1307 (eff. Sept 2025), SB 1826/SB 1827 advancing", enfNote: "SB 1307 mandates ADOT incorporate vertiports into statewide aviation plan by Sept 2026. Enforcement improving. ADOT AAM Specialist being appointed.", dotNote: "ADOT actively engaged. AAM Specialist position being established. eIPP application submitted for Phoenix." },
  { code: "NY", name: "New York", legislation: "none", enforcement: "moderate", dot: "emerging", aamOffice: false, key: "No state UAM legislation. NYC operates via city-level management.", enfNote: "NY State aviation law provides framework. NYC's active heliport management and NYCEDC requirements provide de facto enforcement at city level.", dotNote: "NY DOT beginning AAM conversations. State-level action lags behind NYC city-level engagement." },
  { code: "IL", name: "Illinois", legislation: "none", enforcement: "limited", dot: "none", aamOffice: false, key: "No state UAM legislation", enfNote: "No confirmed state-level enforcement of FAA AC for heliports.", dotNote: "No active Illinois DOT AAM engagement identified." },
  { code: "NV", name: "Nevada", legislation: "enacted", enforcement: "moderate", dot: "emerging", aamOffice: false, key: "NV enacted UAM enabling legislation", enfNote: "Nevada enacted legislation. Enforcement posture moderate — tourism use case driving interest.", dotNote: "NDOT beginning to engage on AAM corridor planning (Las Vegas Strip use case)." },
  { code: "NC", name: "North Carolina", legislation: "none", enforcement: "limited", dot: "emerging", aamOffice: false, key: "NC developing AAM strategy alongside GA for Charlotte-Atlanta corridor", enfNote: "NC adopted IBC. State developing AAM strategy but no enforcement framework codified.", dotNote: "NCDOT Division of Aviation involved in Charlotte-Atlanta corridor study. State action ahead of city action." },
  { code: "GA", name: "Georgia", legislation: "none", enforcement: "limited", dot: "emerging", aamOffice: false, key: "No state UAM legislation. Charlotte-Atlanta corridor study underway.", enfNote: "Limited state enforcement. No confirmed AC adoption.", dotNote: "GA DOT beginning AAM conversations via Charlotte-Atlanta corridor study." },
  { code: "CO", name: "Colorado", legislation: "none", enforcement: "limited", dot: "none", aamOffice: false, key: "No state UAM legislation", enfNote: "No confirmed state enforcement framework.", dotNote: "No active CO DOT AAM engagement identified." },
  { code: "TN", name: "Tennessee", legislation: "none", enforcement: "limited", dot: "none", aamOffice: false, key: "No state UAM legislation", enfNote: "No confirmed state enforcement framework.", dotNote: "No active TN DOT AAM engagement identified." },
  { code: "WA", name: "Washington", legislation: "none", enforcement: "moderate", dot: "emerging", aamOffice: false, key: "No state UAM legislation", enfNote: "WA has moderate aviation oversight through WSDOT Aviation Division.", dotNote: "WSDOT beginning AAM policy discussions." },
  { code: "MA", name: "Massachusetts", legislation: "none", enforcement: "limited", dot: "none", aamOffice: false, key: "No state UAM legislation", enfNote: "No confirmed state enforcement framework.", dotNote: "No active MA DOT AAM engagement identified." },
  { code: "MI", name: "Michigan", legislation: "none", enforcement: "limited", dot: "none", aamOffice: false, key: "No state UAM legislation", enfNote: "No confirmed state enforcement framework.", dotNote: "No active MI DOT AAM engagement identified." },
  { code: "OH", name: "Ohio", legislation: "none", enforcement: "limited", dot: "emerging", aamOffice: false, key: "OH HB 251 identified. Joby manufacturing presence in Dayton.", enfNote: "Ohio has limited heliport enforcement per Rex.", dotNote: "OH DOT beginning engagement. Joby Dayton manufacturing facility is anchor." },
  { code: "MN", name: "Minnesota", legislation: "none", enforcement: "limited", dot: "none", aamOffice: false, key: "No state UAM legislation", enfNote: "No confirmed state enforcement framework.", dotNote: "No active MN DOT AAM engagement identified." },
  { code: "DC", name: "District of Columbia", legislation: "none", enforcement: "moderate", dot: "none", aamOffice: false, key: "Federal district — unique regulatory context", enfNote: "DC airspace heavily restricted (SFRA/FRZ). Unique federal overlay complicates UAM deployment.", dotNote: "N/A — federal district." },
];

// ─────────────────────────────────────────────────────────
// Regional Clusters
// ─────────────────────────────────────────────────────────

const CLUSTERS = [
  { name: "SoCal Corridor", markets: ["los_angeles", "san_diego"], desc: "Los Angeles to San Diego corridor. Highest operator density in the US. CA SB 944 provides unified state framework.", corridor: "LAX-DTLA, LAX-Santa Monica, potential LA-SD intercity route." },
  { name: "Texas Triangle", markets: ["dallas", "houston", "austin"], desc: "Dallas-Houston-Austin triangle. TX HB 1735 applies to all three markets. Wisk testing in DFW.", corridor: "DFW-Downtown Dallas, potential intercity DFW-IAH route." },
  { name: "Florida Corridor", markets: ["miami", "orlando", "tampa"], desc: "South and Central Florida markets. FL SB 1662 provides strongest state enforcement framework in the US. FDOT AAM training program.", corridor: "MIA-Fort Lauderdale (Joby), potential Orlando-Tampa intercity." },
  { name: "Northeast Corridor", markets: ["new_york", "boston"], desc: "NYC and Boston. NYC has strongest city-level heliport management. No state UAM legislation in either state.", corridor: "JFK-Manhattan (Joby), potential NYC-BOS intercity (long-term)." },
  { name: "Southeast Emerging", markets: ["charlotte", "atlanta", "nashville"], desc: "Charlotte-Atlanta corridor study underway (NCDOT + GA DOT). Nashville early-stage. No state legislation in any market.", corridor: "Charlotte-Atlanta AAM corridor study in progress." },
  { name: "Mountain West", markets: ["denver", "phoenix", "las_vegas"], desc: "Phoenix is the leader (AZ SB 1307, eIPP). Denver and Las Vegas lagging on legislation. Tourism use case in LV.", corridor: "PHX-Scottsdale (Joby). LV Strip corridor (tourism)." },
  { name: "Pacific Northwest", markets: ["seattle"], desc: "Seattle standalone. No state legislation. Moderate regulatory posture via WSDOT.", corridor: "No announced corridors." },
  { name: "Midwest", markets: ["chicago", "detroit", "columbus", "minneapolis"], desc: "Chicago is the leader (Archer/United). Columbus has Joby manufacturing. Detroit and Minneapolis early-stage.", corridor: "ORD-Downtown Chicago (Archer). Columbus emerging via Joby Dayton." },
];

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // ── State Context ──
  console.log("═══ MCS State Context ═══\n");
  let statesCreated = 0;
  for (const sc of STATE_CONTEXTS) {
    if (dryRun) {
      console.log(`  [dry] ${sc.code} — ${sc.name} (leg: ${sc.legislation}, enf: ${sc.enforcement})`);
      statesCreated++;
      continue;
    }
    await prisma.mcsStateContext.upsert({
      where: { stateCode: sc.code },
      create: {
        stateCode: sc.code,
        stateName: sc.name,
        legislationStatus: sc.legislation,
        enforcementPosture: sc.enforcement,
        enforcementNote: sc.enfNote,
        dotAamEngagement: sc.dot,
        dotAamNote: sc.dotNote,
        aamOfficeEstablished: sc.aamOffice,
        keyLegislation: sc.key,
      },
      update: {
        legislationStatus: sc.legislation,
        enforcementPosture: sc.enforcement,
        enforcementNote: sc.enfNote,
        dotAamEngagement: sc.dot,
        dotAamNote: sc.dotNote,
        aamOfficeEstablished: sc.aamOffice,
        keyLegislation: sc.key,
      },
    });
    console.log(`  ✓ ${sc.code} — ${sc.name} (${sc.legislation}, ${sc.enforcement})`);
    statesCreated++;
  }
  console.log(`\n${statesCreated} states seeded.\n`);

  // ── Regional Clusters ──
  console.log("═══ MCS Regional Clusters ═══\n");
  for (const cl of CLUSTERS) {
    if (dryRun) {
      console.log(`  [dry] ${cl.name} (${cl.markets.length} markets)`);
      continue;
    }
    await prisma.mcsRegionalCluster.upsert({
      where: { name: cl.name },
      create: {
        name: cl.name,
        description: cl.desc,
        marketIds: cl.markets,
        corridorRelevance: cl.corridor,
      },
      update: {
        description: cl.desc,
        marketIds: cl.markets,
        corridorRelevance: cl.corridor,
      },
    });
    console.log(`  ✓ ${cl.name}: ${cl.markets.join(", ")}`);
  }

  // ── Peer Groups ──
  console.log("\n═══ MCS Peer Groups ═══\n");

  // Compute scores and tiers for peer grouping
  const scored = CITIES.map(c => {
    const { score } = calculateReadinessScore(c);
    return { id: c.id, city: c.city, state: c.state, score, tier: getScoreTier(score) };
  });

  // Generate SAME_TIER peer groups
  const tiers = ["ADVANCED", "MODERATE", "EARLY", "NASCENT"];
  for (const city of scored) {
    const sameTier = scored
      .filter(c => c.tier === city.tier && c.id !== city.id)
      .map(c => c.id);

    const sameState = scored
      .filter(c => c.state === city.state && c.id !== city.id)
      .map(c => c.id);

    if (dryRun) {
      console.log(`  [dry] ${city.city}: tier peers=${sameTier.length}, state peers=${sameState.length}`);
      continue;
    }

    // SAME_TIER
    await prisma.mcsPeerGroup.upsert({
      where: { marketId_groupingBasis: { marketId: city.id, groupingBasis: "SAME_TIER" } },
      create: {
        marketId: city.id,
        peerMarketIds: sameTier,
        groupingBasis: "SAME_TIER",
        notes: `${city.tier} tier peers (${sameTier.length} markets)`,
      },
      update: {
        peerMarketIds: sameTier,
        notes: `${city.tier} tier peers (${sameTier.length} markets)`,
      },
    });

    // SAME_STATE (only if there are peers)
    if (sameState.length > 0) {
      await prisma.mcsPeerGroup.upsert({
        where: { marketId_groupingBasis: { marketId: city.id, groupingBasis: "SAME_STATE" } },
        create: {
          marketId: city.id,
          peerMarketIds: sameState,
          groupingBasis: "SAME_STATE",
          notes: `${city.state} state peers (${sameState.length} markets)`,
        },
        update: {
          peerMarketIds: sameState,
          notes: `${city.state} state peers (${sameState.length} markets)`,
        },
      });
    }
  }

  if (!dryRun) {
    const peerCount = await prisma.mcsPeerGroup.count();
    console.log(`  ${peerCount} peer group records created.\n`);
  }

  // ── Summary ──
  console.log("═══ MCS Summary ═══");
  console.log(`States: ${STATE_CONTEXTS.length}`);
  console.log(`  Enacted legislation: ${STATE_CONTEXTS.filter(s => s.legislation === "enacted").length}`);
  console.log(`  Strong enforcement: ${STATE_CONTEXTS.filter(s => s.enforcement === "strong").length}`);
  console.log(`  Active DOT AAM: ${STATE_CONTEXTS.filter(s => s.dot === "active").length}`);
  console.log(`Regional clusters: ${CLUSTERS.length}`);
  console.log(`Markets covered by clusters: ${new Set(CLUSTERS.flatMap(c => c.markets)).size}`);
}

main()
  .catch((err) => { console.error("Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
