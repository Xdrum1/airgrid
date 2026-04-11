/**
 * Pulse pre-flight check — run before sending to catch hallucinated cities
 * and stale leaderboard claims against current DB state.
 *
 * Usage:
 *   npx tsx scripts/pulse-preflight.ts              # checks latest Pulse
 *   npx tsx scripts/pulse-preflight.ts --issue 5    # checks specific issue
 *   npx tsx scripts/pulse-preflight.ts --file path  # checks explicit file
 *
 * Exits 0 on pass, 1 on any failure. Designed to be run before send-pulse.ts.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { getCitiesWithOverrides } from "../src/data/seed";
import { calculateReadinessScoreFromFkb } from "../src/lib/scoring";

const prisma = new PrismaClient();

// Metro suburbs that must roll up to a parent market. If these appear in the
// Pulse text as peer markets, that's the Issue 5 failure mode — the classifier
// has the same map in classifier.ts; kept here to keep the script standalone.
const SUBURB_TO_PARENT: Record<string, string> = {
  // Phoenix metro — the cities Pulse Issue 5 named that don't exist
  Scottsdale: "Phoenix",
  Mesa: "Phoenix",
  Chandler: "Phoenix",
  Tempe: "Phoenix",
  // SF Bay Area
  Oakland: "San Francisco",
  "San Jose": "San Francisco",
  Berkeley: "San Francisco",
  "Palo Alto": "San Francisco",
  "Mountain View": "San Francisco",
  Fremont: "San Francisco",
  // DFW
  "Fort Worth": "Dallas",
  Arlington: "Dallas",
  Plano: "Dallas",
  Irving: "Dallas",
  // South Florida
  "Fort Lauderdale": "Miami",
  "Boca Raton": "Miami",
  "West Palm Beach": "Miami",
  Hialeah: "Miami",
  // NYC
  "Jersey City": "New York",
  Newark: "New York",
  Hoboken: "New York",
  Brooklyn: "New York",
  Queens: "New York",
  // LA metro
  "Long Beach": "Los Angeles",
  Pasadena: "Los Angeles",
  "Santa Monica": "Los Angeles",
  Burbank: "Los Angeles",
  Inglewood: "Los Angeles",
};

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&middot;/g, "·")
    .replace(/\s+/g, " ")
    .trim();
}

function findPulseFile(args: string[]): { path: string; issue: number } {
  const fileIdx = args.indexOf("--file");
  if (fileIdx >= 0 && args[fileIdx + 1]) {
    const path = args[fileIdx + 1];
    const match = path.match(/Issue(\d+)/);
    return { path, issue: match ? parseInt(match[1]) : 0 };
  }

  const docsDir = join(__dirname, "../public/docs");
  const files = readdirSync(docsDir)
    .filter((f) => f.startsWith("UAM_Market_Pulse_Issue") && f.endsWith(".html"))
    .sort();

  const issueIdx = args.indexOf("--issue");
  if (issueIdx >= 0) {
    const num = parseInt(args[issueIdx + 1]);
    const target = files.find((f) => f.includes(`Issue${num}`));
    if (!target) throw new Error(`Pulse Issue ${num} not found`);
    return { path: join(docsDir, target), issue: num };
  }

  const latest = files[files.length - 1];
  if (!latest) throw new Error("No Pulse HTML files found");
  const match = latest.match(/Issue(\d+)/);
  return { path: join(docsDir, latest), issue: match ? parseInt(match[1]) : 0 };
}

export type Check = { level: "fail" | "warn"; message: string };

export async function runPreflight(html: string): Promise<Check[]> {
  const text = stripHtml(html);

  // Load current city state from DB (merged with applied overrides)
  const cities = await getCitiesWithOverrides();
  const scored = await Promise.all(
    cities.map(async (c) => {
      const { score } = await calculateReadinessScoreFromFkb(c);
      return { ...c, _score: score };
    }),
  );

  const byDisplayName = new Map<string, (typeof scored)[number]>();
  for (const c of scored) {
    byDisplayName.set(`${c.city}, ${c.state}`, c);
  }

  const checks: Check[] = [];

  // --- Check 1: Leaderboard score consistency ---
  // Parse table rows in the form:
  //   <td...>City, ST</td> ... <td...>NN</td>
  const rowRegex =
    /<td[^>]*>([A-Z][A-Za-z .'-]+?, [A-Z]{2})<\/td>[\s\S]*?<td[^>]*>(\d{1,3})<\/td>/g;
  const leaderboardRows: { name: string; claimed: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(html)) !== null) {
    leaderboardRows.push({ name: m[1], claimed: parseInt(m[2]) });
  }

  if (leaderboardRows.length === 0) {
    checks.push({
      level: "warn",
      message: "No leaderboard rows detected — table format may have changed",
    });
  } else {
    console.log(`Leaderboard rows found: ${leaderboardRows.length}`);
    for (const row of leaderboardRows) {
      const city = byDisplayName.get(row.name);
      if (!city) {
        checks.push({
          level: "fail",
          message: `Leaderboard row "${row.name}" not found in seed — hallucinated or misspelled`,
        });
        continue;
      }
      if (city._score !== row.claimed) {
        checks.push({
          level: "fail",
          message: `${row.name}: Pulse claims ${row.claimed}, DB has ${city._score}`,
        });
      }
    }
  }

  // --- Check 2: Hallucinated peer-market suburbs in narrative ---
  // Match as whole words. The Issue 5 failure mode was a comma list like
  // "Phoenix, Scottsdale, Mesa, Chandler, and Tempe" treating suburbs as peers.
  for (const [suburb, parent] of Object.entries(SUBURB_TO_PARENT)) {
    const pattern = new RegExp(`\\b${suburb}\\b`, "g");
    if (pattern.test(text)) {
      checks.push({
        level: "fail",
        message: `"${suburb}" appears in narrative — should roll up to ${parent} (not a tracked market)`,
      });
    }
  }

  // --- Check 3: Phoenix-specific sanity (issue 5 regression guard) ---
  // If Phoenix is mentioned with a specific score claim like "Phoenix ... 50"
  // and the DB says otherwise, flag. Light heuristic — exact score-adjacent mentions.
  const phx = scored.find((c) => c.id === "phoenix");
  if (phx) {
    const phxClaims = [...text.matchAll(/Phoenix[^.]{0,80}?(\d{2})\b/g)].map(
      (mm) => parseInt(mm[1]),
    );
    const wrongClaims = phxClaims.filter(
      (n) => n >= 20 && n <= 100 && n !== phx._score,
    );
    if (wrongClaims.length > 0) {
      checks.push({
        level: "warn",
        message: `Phoenix narrative mentions score(s) ${wrongClaims.join(", ")} near its name; DB has ${phx._score}. Verify these are historical references, not current claims.`,
      });
    }
  }

  return checks;
}

export function printChecks(checks: Check[]): { fails: number; warns: number } {
  const fails = checks.filter((c) => c.level === "fail");
  const warns = checks.filter((c) => c.level === "warn");

  if (fails.length > 0) {
    console.log(`\nFAIL (${fails.length}):`);
    for (const c of fails) console.log(`  ✗ ${c.message}`);
  }
  if (warns.length > 0) {
    console.log(`\nWARN (${warns.length}):`);
    for (const c of warns) console.log(`  ! ${c.message}`);
  }
  if (fails.length === 0 && warns.length === 0) {
    console.log("\nAll checks passed.");
  }

  return { fails: fails.length, warns: warns.length };
}

async function main() {
  const args = process.argv.slice(2);
  const pulse = findPulseFile(args);
  const html = readFileSync(pulse.path, "utf-8");

  console.log(`\nPulse pre-flight: Issue ${pulse.issue}`);
  console.log(`File: ${pulse.path}\n`);

  const checks = await runPreflight(html);
  const { fails } = printChecks(checks);

  console.log("");
  await prisma.$disconnect();
  process.exit(fails > 0 ? 1 : 0);
}

// Only run main() when invoked directly, not when imported.
if (require.main === module) {
  main().catch((err) => {
    console.error("Pre-flight error:", err);
    prisma.$disconnect();
    process.exit(2);
  });
}
