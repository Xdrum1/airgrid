/**
 * MCS Expansion — Add state context for states with heliports but no MCS data
 *
 * Focuses on states with 100+ FAA-registered heliports that are missing
 * from McsStateContext. Legislation status derived from LegiScan pipeline
 * data and public records.
 *
 * Usage:
 *   npx tsx scripts/seed-mcs-expansion.ts
 *   npx tsx scripts/seed-mcs-expansion.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

const NEW_STATES: {
  stateCode: string;
  stateName: string;
  legislationStatus: string;
  enforcementPosture: string;
  enforcementNote: string | null;
  dotAamEngagement: string;
  dotAamNote: string | null;
  aamOfficeEstablished: boolean;
  keyLegislation: string | null;
}[] = [
  {
    stateCode: "PA",
    stateName: "Pennsylvania",
    legislationStatus: "none",
    enforcementPosture: "moderate",
    enforcementNote: "PennDOT Bureau of Aviation regulates heliports under state aviation code. Registration required but enforcement is complaint-driven.",
    dotAamEngagement: "emerging",
    dotAamNote: "PennDOT participated in FAA UAS Integration Pilot Program via PHL airport. Philadelphia exploring AAM for airport-to-center city corridor.",
    aamOfficeEstablished: false,
    keyLegislation: null,
  },
  {
    stateCode: "NJ",
    stateName: "New Jersey",
    legislationStatus: "none",
    enforcementPosture: "moderate",
    enforcementNote: "NJDOT Division of Aeronautics requires registration. State has heliport licensing requirements. Enforcement moderate — concentrated in metro areas near NYC.",
    dotAamEngagement: "emerging",
    dotAamNote: "NJ proximity to NYC AAM corridor (EWR-Manhattan) drives implicit engagement. No dedicated AAM initiative.",
    aamOfficeEstablished: false,
    keyLegislation: null,
  },
  {
    stateCode: "LA",
    stateName: "Louisiana",
    legislationStatus: "actively_moving",
    enforcementPosture: "moderate",
    enforcementNote: "LDOTD Aviation Division oversees heliports. Strong offshore helicopter industry presence gives the state deeper heliport regulatory experience than most.",
    dotAamEngagement: "active",
    dotAamNote: "LIFTOff Louisiana initiative actively developing AAM strategy. HR89 commended the LIFTOff team. Oil/gas helicopter infrastructure provides conversion pathway.",
    aamOfficeEstablished: false,
    keyLegislation: "HR 89 (commending LIFTOff Louisiana AAM initiative)",
  },
  {
    stateCode: "AL",
    stateName: "Alabama",
    legislationStatus: "none",
    enforcementPosture: "limited",
    enforcementNote: "ALDOT Aeronautics Bureau registers heliports. Limited active enforcement. Military aviation presence (Ft. Rucker/Novosel) drives some infrastructure investment.",
    dotAamEngagement: "none",
    dotAamNote: null,
    aamOfficeEstablished: false,
    keyLegislation: null,
  },
  {
    stateCode: "MO",
    stateName: "Missouri",
    legislationStatus: "none",
    enforcementPosture: "limited",
    enforcementNote: "MoDOT Aviation Section registers airports and heliports. Enforcement limited to registration compliance.",
    dotAamEngagement: "none",
    dotAamNote: null,
    aamOfficeEstablished: false,
    keyLegislation: null,
  },
  {
    stateCode: "VA",
    stateName: "Virginia",
    legislationStatus: "actively_moving",
    enforcementPosture: "moderate",
    enforcementNote: "Virginia Department of Aviation has active regulatory framework. State requires heliport licensing. DOAV has shown interest in AAM through Virginia Smart Community Testbed.",
    dotAamEngagement: "active",
    dotAamNote: "Virginia Unmanned Systems Center at Virginia Tech. State positioning as AAM testing corridor between DC metro and Hampton Roads.",
    aamOfficeEstablished: false,
    keyLegislation: "SB 1307 (Virginia advanced aviation study), HB 2462 (UAS/AAM framework study)",
  },
  {
    stateCode: "KY",
    stateName: "Kentucky",
    legislationStatus: "none",
    enforcementPosture: "limited",
    enforcementNote: "Kentucky Transportation Cabinet Division of Aeronautics oversees heliports. Registration required. Limited enforcement beyond registration.",
    dotAamEngagement: "emerging",
    dotAamNote: "Amazon Prime Air and drone delivery activity in Kentucky. UPS Flight Forward operates from Louisville. Drone corridor activity may drive AAM engagement.",
    aamOfficeEstablished: false,
    keyLegislation: null,
  },
  {
    stateCode: "IN",
    stateName: "Indiana",
    legislationStatus: "none",
    enforcementPosture: "limited",
    enforcementNote: "INDOT Division of Aeronautics registers heliports. Enforcement limited.",
    dotAamEngagement: "emerging",
    dotAamNote: "Purdue University AAM research activity. Indianapolis Motor Speedway eVTOL demo events have generated interest.",
    aamOfficeEstablished: false,
    keyLegislation: null,
  },
  {
    stateCode: "WI",
    stateName: "Wisconsin",
    legislationStatus: "none",
    enforcementPosture: "limited",
    enforcementNote: "WisDOT Bureau of Aeronautics registers heliports. Limited enforcement.",
    dotAamEngagement: "none",
    dotAamNote: null,
    aamOfficeEstablished: false,
    keyLegislation: null,
  },
  {
    stateCode: "NH",
    stateName: "New Hampshire",
    legislationStatus: "none",
    enforcementPosture: "limited",
    enforcementNote: "NH DOT Bureau of Aeronautics registers heliports. Minimal enforcement framework.",
    dotAamEngagement: "none",
    dotAamNote: null,
    aamOfficeEstablished: false,
    keyLegislation: null,
  },
  {
    stateCode: "SC",
    stateName: "South Carolina",
    legislationStatus: "none",
    enforcementPosture: "limited",
    enforcementNote: "SCDOT Division of Intermodal and Freight Programs oversees aviation. Heliport registration required. Limited active enforcement.",
    dotAamEngagement: "emerging",
    dotAamNote: "SCRA (South Carolina Research Authority) supporting AAM-related ventures through SC Launch program. Charleston/Myrtle Beach proximity to military aviation.",
    aamOfficeEstablished: false,
    keyLegislation: null,
  },
  {
    stateCode: "UT",
    stateName: "Utah",
    legislationStatus: "enacted",
    enforcementPosture: "moderate",
    enforcementNote: "UDOT Division of Aeronautics actively regulates heliports. State has progressive approach to aviation technology.",
    dotAamEngagement: "active",
    dotAamNote: "Utah passed AAM-enabling legislation. State positioning for AAM testing and deployment alongside existing drone corridor work.",
    aamOfficeEstablished: false,
    keyLegislation: "SB 225 (Utah Advanced Air Mobility Act)",
  },
  {
    stateCode: "OK",
    stateName: "Oklahoma",
    legislationStatus: "actively_moving",
    enforcementPosture: "limited",
    enforcementNote: "Oklahoma Aeronautics Commission registers heliports. Limited enforcement but growing interest.",
    dotAamEngagement: "emerging",
    dotAamNote: "Oklahoma has active UAS testing at designated FAA test sites. AAM legislation in committee.",
    aamOfficeEstablished: false,
    keyLegislation: "HB 2117 (Oklahoma AAM study bill)",
  },
];

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);
  console.log(`═══ MCS State Context Expansion — ${NEW_STATES.length} states ═══\n`);

  let created = 0;
  let skipped = 0;

  for (const state of NEW_STATES) {
    if (dryRun) {
      console.log(`  [dry] ${state.stateCode} — ${state.stateName} (${state.legislationStatus}, ${state.enforcementPosture}, ${state.dotAamEngagement})`);
      created++;
    } else {
      const existing = await prisma.mcsStateContext.findUnique({
        where: { stateCode: state.stateCode },
      });

      if (existing) {
        console.log(`  ○ ${state.stateCode} — ${state.stateName} (already exists)`);
        skipped++;
      } else {
        await prisma.mcsStateContext.create({ data: state });
        console.log(`  ✓ ${state.stateCode} — ${state.stateName} (${state.legislationStatus})`);
        created++;
      }
    }
  }

  console.log(`\n${created} created, ${skipped} skipped.\n`);

  if (!dryRun) {
    const total = await prisma.mcsStateContext.count();
    console.log(`Total MCS state contexts: ${total}/50`);
  }
}

main()
  .catch((err) => { console.error("Error:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
