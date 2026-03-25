/**
 * One-off script to send a sample weekly digest email.
 * Usage: npx tsx --env-file=.env.local scripts/test-digest.ts
 */

import { sendDigestEmail } from "../src/lib/email";

const sampleEntries = [
  {
    entityName: "Los Angeles",
    changeType: "faa_update",
    summary:
      "TruWeather deploys eIPP low-altitude weather sensors at LA Basin vertiport sites — sub-500ft wind shear monitoring now active across 12 locations.",
    sourceUrl: "https://www.faa.gov/uas/programs_partnerships/data_exchange",
  },
  {
    entityName: "Joby Aviation",
    changeType: "status_change",
    summary:
      "Joby Aviation launches Uber Air commercial eVTOL service in Dubai — first-ever commercial air taxi operations using Joby S4 aircraft.",
    sourceUrl: "https://www.jobyaviation.com/news/",
  },
  {
    entityName: "LAX → Santa Monica Corridor",
    changeType: "new_filing",
    summary:
      "New corridor filing submitted for LAX to Santa Monica route. Environmental assessment phase initiated, public comment period opens March 15.",
  },
  {
    entityName: "Dallas",
    changeType: "new_law",
    summary:
      "Texas HB 1735 signed into law — establishes statewide framework for UAM operations, vertiport permitting, and corridor authorization.",
    sourceUrl: "https://capitol.texas.gov",
  },
  {
    entityName: "Miami",
    changeType: "score_change",
    summary:
      "Miami readiness score increased from 65 to 75 following new vertiport permit approval and Archer Aviation partnership announcement.",
  },
];

async function main() {
  console.log("Sending test digest email to alan@airindex.io...\n");

  const sent = await sendDigestEmail({
    to: "alan@airindex.io",
    subscriptionId: "test-digest-preview",
    entries: sampleEntries,
    weekStart: "Feb 23",
    weekEnd: "Mar 1",
  });

  if (sent) {
    console.log("\nDone — check your inbox.");
  } else {
    console.log("\nFailed — check SES credentials in .env.local");
  }
}

main().catch(console.error);
