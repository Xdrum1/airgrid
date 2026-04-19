/**
 * Heliport Data Quality Analysis
 *
 * Analyzes NASR data for staleness, completeness, and reliability.
 * Based on findings from Rex Alexander's VFS Forum 80 paper:
 *   - 691 heliports with blank data fields
 *   - 962 with data >20 years old
 *   - 332 healthcare facilities not identified as Medical-Use
 *
 * Outputs:
 *   1. Data Quality Score (0-100) per facility
 *   2. AC Era classification based on Activation Date
 *   3. Hospital reconciliation (keyword match vs Medical-Use flag)
 *   4. Summary statistics
 *
 * Usage: npx tsx scripts/analyze-data-quality.ts [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const CSV_FILE = path.join(process.cwd(), "data", "nasr", "APT_BASE.csv");
const OUT_FILE = path.join(process.cwd(), "data", "heliport-data-quality.json");

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { fields.push(current.trim()); current = ""; }
      else current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// AC era classification based on Rex's VFS Forum 80 paper (Table 5)
interface ACEra {
  version: string;
  yearStart: number;
  yearEnd: number;
  tloTerminology: string;
  fatoTerminology: string;
}

const AC_ERAS: ACEra[] = [
  { version: "Original (1959)", yearStart: 1927, yearEnd: 1964, tloTerminology: "Touchdown Area", fatoTerminology: "Takeoff and Landing Area" },
  { version: "1 (1964)", yearStart: 1964, yearEnd: 1977, tloTerminology: "Touchdown Pad", fatoTerminology: "Takeoff and Landing Area" },
  { version: "1A-1B (1977)", yearStart: 1977, yearEnd: 1986, tloTerminology: "Touchdown Pad", fatoTerminology: "Landing and Takeoff Area" },
  { version: "2 (1988)", yearStart: 1986, yearEnd: 1994, tloTerminology: "Touchdown Area", fatoTerminology: "Final Approach and Takeoff (FATO)" },
  { version: "2A (1994)", yearStart: 1994, yearEnd: 2004, tloTerminology: "Touchdown and Liftoff (TLOF)", fatoTerminology: "Final Approach and Takeoff (FATO)" },
  { version: "2B (2004)", yearStart: 2004, yearEnd: 2012, tloTerminology: "TLOF", fatoTerminology: "FATO" },
  { version: "2C (2012)", yearStart: 2012, yearEnd: 2023, tloTerminology: "TLOF (0.83D)", fatoTerminology: "FATO" },
  { version: "2D (2023)", yearStart: 2023, yearEnd: 2099, tloTerminology: "TLOF (0.83D)", fatoTerminology: "FATO" },
];

function getACEra(activationDate: string | null): ACEra | null {
  if (!activationDate) return null;
  // Format: YYYY/MM or MM/YYYY
  const match = activationDate.match(/(\d{4})\/(\d{2})/) || activationDate.match(/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const year = parseInt(match[1]) > 1900 ? parseInt(match[1]) : parseInt(match[2]);
  return AC_ERAS.find(e => year >= e.yearStart && year < e.yearEnd) ?? null;
}

const HOSPITAL_KEYWORDS = [
  "hospital", "medical", "health", "mercy", "memorial", "clinic",
  "trauma", "care", "emergency", "st.", "saint", "regional med",
  "children", "pediatric", "veterans", "va ", "rehab",
];

function isLikelyHospital(name: string): boolean {
  const lower = name.toLowerCase();
  return HOSPITAL_KEYWORDS.some(kw => lower.includes(kw));
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === "") return null;
  // Format: MM/YYYY or MM/DD/YYYY or YYYY/MM/DD
  const parts = dateStr.split("/");
  if (parts.length === 2) return new Date(parseInt(parts[1]), parseInt(parts[0]) - 1);
  if (parts.length === 3) {
    if (parseInt(parts[0]) > 1900) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  }
  return null;
}

function yearsSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.round((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10;
}

interface FacilityQuality {
  id: string;
  name: string;
  state: string;
  city: string;
  ownershipType: string;
  useType: string;
  activationDate: string | null;
  lastInspection: string | null;
  lastInfoResponse: string | null;
  positionSourceDate: string | null;
  elevationSourceDate: string | null;
  acEra: string | null;
  tloTerminology: string | null;
  dataQualityScore: number;
  dataAge: number | null;
  isLikelyHospital: boolean;
  isFlaggedMedicalUse: boolean;
  misclassified: boolean;
  blankFields: number;
  staleness: "current" | "aging" | "stale" | "very_stale" | "unknown";
}

function main() {
  if (!existsSync(CSV_FILE)) {
    console.error("APT_BASE.csv not found");
    process.exit(1);
  }

  const content = readFileSync(CSV_FILE, "utf-8");
  const lines = content.split("\n");
  const header = parseCSVLine(lines[0]);
  const col = (name: string) => header.indexOf(name);

  const iSiteType = col("SITE_TYPE_CODE");
  const iArptId = col("ARPT_ID");
  const iName = col("ARPT_NAME");
  const iCity = col("CITY");
  const iState = col("STATE_CODE");
  const iOwnership = col("OWNERSHIP_TYPE_CODE");
  const iUse = col("FACILITY_USE_CODE");
  const iActivation = col("ACTIVATION_DATE");
  const iLastInspection = col("LAST_INSPECTION");
  const iLastInfo = col("LAST_INFO_RESPONSE");
  const iPosSrcDate = col("POSITION_SRC_DATE");
  const iElevSrcDate = col("ELEVATION_SRC_DATE");

  const results: FacilityQuality[] = [];
  let totalHeliports = 0;
  let blankFieldCount = 0;
  let over20years = 0;
  let hospitalMismatch = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCSVLine(line);
    if (fields[iSiteType] !== "H") continue;
    totalHeliports++;

    const id = fields[iArptId];
    const name = fields[iName] || "";
    const activation = fields[iActivation] || null;
    const lastInspection = fields[iLastInspection] || null;
    const lastInfo = fields[iLastInfo] || null;
    const posSrcDate = fields[iPosSrcDate] || null;
    const elevSrcDate = fields[iElevSrcDate] || null;
    const useType = fields[iUse] || "";

    // AC Era
    const era = getACEra(activation);

    // Count blank critical fields
    let blanks = 0;
    if (!activation) blanks++;
    if (!lastInspection) blanks++;
    if (!lastInfo) blanks++;
    if (!posSrcDate) blanks++;
    if (!elevSrcDate) blanks++;
    if (blanks > 0) blankFieldCount++;

    // Data age (most recent date field)
    const dates = [lastInspection, lastInfo, posSrcDate, elevSrcDate]
      .map(d => parseDate(d || ""))
      .filter((d): d is Date => d !== null);
    const mostRecent = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
    const ageYears = yearsSince(mostRecent);

    if (ageYears && ageYears > 20) over20years++;

    // Staleness tier
    let staleness: FacilityQuality["staleness"] = "unknown";
    if (ageYears === null) staleness = "unknown";
    else if (ageYears <= 3) staleness = "current";
    else if (ageYears <= 7) staleness = "aging";
    else if (ageYears <= 15) staleness = "stale";
    else staleness = "very_stale";

    // Data Quality Score (0-100, higher = better quality)
    let dqs = 100;
    // Penalize blank fields (up to 25 pts)
    dqs -= blanks * 5;
    // Penalize staleness (up to 40 pts)
    if (ageYears === null) dqs -= 30;
    else if (ageYears > 20) dqs -= 40;
    else if (ageYears > 10) dqs -= 30;
    else if (ageYears > 5) dqs -= 15;
    else if (ageYears > 3) dqs -= 5;
    // Penalize missing activation date (15 pts — can't determine AC era)
    if (!activation) dqs -= 15;
    // Penalize pre-1994 terminology confusion (10 pts)
    if (era && era.yearStart < 1994) dqs -= 10;
    dqs = Math.max(0, Math.min(100, dqs));

    // Hospital reconciliation
    const likelyHospital = isLikelyHospital(name);
    const flaggedMedical = useType.toLowerCase().includes("pr") && name.toLowerCase().match(/hospital|medical|health|mercy|memorial/) !== null;
    // Misclassified = looks like a hospital but not flagged as medical use
    // Note: in NASR, medical-use is a subcategory but the use code doesn't always reflect it
    const misclassified = likelyHospital && !flaggedMedical;
    if (misclassified) hospitalMismatch++;

    results.push({
      id,
      name,
      state: fields[iState] || "",
      city: fields[iCity] || "",
      ownershipType: fields[iOwnership] || "",
      useType,
      activationDate: activation,
      lastInspection,
      lastInfoResponse: lastInfo,
      positionSourceDate: posSrcDate,
      elevationSourceDate: elevSrcDate,
      acEra: era?.version ?? null,
      tloTerminology: era?.tloTerminology ?? null,
      dataQualityScore: dqs,
      dataAge: ageYears,
      isLikelyHospital: likelyHospital,
      isFlaggedMedicalUse: flaggedMedical,
      misclassified,
      blankFields: blanks,
      staleness,
    });
  }

  // Summary
  console.log("=== HELIPORT DATA QUALITY ANALYSIS ===\n");
  console.log(`Total heliports: ${totalHeliports}`);
  console.log(`With blank critical fields: ${blankFieldCount} (${(blankFieldCount/totalHeliports*100).toFixed(1)}%)`);
  console.log(`Data >20 years old: ${over20years} (${(over20years/totalHeliports*100).toFixed(1)}%)`);
  console.log(`Hospital-keyword facilities: ${results.filter(r => r.isLikelyHospital).length}`);
  console.log(`Potentially misclassified hospitals: ${hospitalMismatch}`);

  // Staleness distribution
  const byStale: Record<string, number> = {};
  results.forEach(r => { byStale[r.staleness] = (byStale[r.staleness] ?? 0) + 1; });
  console.log("\nStaleness distribution:");
  Object.entries(byStale).sort((a, b) => b[1] - a[1]).forEach(([s, c]) =>
    console.log(`  ${s.padEnd(12)} ${String(c).padStart(5)} (${(c/totalHeliports*100).toFixed(1)}%)`)
  );

  // DQS distribution
  const dqsBuckets = { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 };
  results.forEach(r => {
    if (r.dataQualityScore >= 80) dqsBuckets.excellent++;
    else if (r.dataQualityScore >= 60) dqsBuckets.good++;
    else if (r.dataQualityScore >= 40) dqsBuckets.fair++;
    else if (r.dataQualityScore >= 20) dqsBuckets.poor++;
    else dqsBuckets.critical++;
  });
  console.log("\nData Quality Score distribution:");
  Object.entries(dqsBuckets).forEach(([tier, c]) =>
    console.log(`  ${tier.padEnd(12)} ${String(c).padStart(5)} (${(c/totalHeliports*100).toFixed(1)}%)`)
  );

  // AC Era distribution
  const byEra: Record<string, number> = {};
  results.forEach(r => { byEra[r.acEra ?? "unknown"] = (byEra[r.acEra ?? "unknown"] ?? 0) + 1; });
  console.log("\nAC Era distribution:");
  Object.entries(byEra).sort((a, b) => b[1] - a[1]).forEach(([e, c]) =>
    console.log(`  ${e.padEnd(20)} ${String(c).padStart(5)} (${(c/totalHeliports*100).toFixed(1)}%)`)
  );

  // Sample worst DQS
  const worst = results.sort((a, b) => a.dataQualityScore - b.dataQualityScore).slice(0, 10);
  console.log("\nLowest Data Quality Scores:");
  worst.forEach(r =>
    console.log(`  ${r.id.padEnd(8)} ${r.name.substring(0, 30).padEnd(32)} DQS=${String(r.dataQualityScore).padStart(3)} | ${r.staleness} | era=${r.acEra ?? "?"}`)
  );

  // Sample misclassified hospitals
  const misclass = results.filter(r => r.misclassified).slice(0, 10);
  console.log("\nSample misclassified hospitals (likely hospital, not flagged medical):");
  misclass.forEach(r =>
    console.log(`  ${r.id.padEnd(8)} ${r.name.substring(0, 40).padEnd(42)} ${r.state} | use=${r.useType}`)
  );

  if (!DRY_RUN) {
    writeFileSync(OUT_FILE, JSON.stringify({
      analyzedAt: new Date().toISOString(),
      totalHeliports,
      summary: {
        blankFieldCount,
        over20years,
        hospitalKeywordCount: results.filter(r => r.isLikelyHospital).length,
        misclassifiedHospitals: hospitalMismatch,
        staleness: byStale,
        dqsDistribution: dqsBuckets,
        acEraDistribution: byEra,
      },
      facilities: results,
    }, null, 2));
    console.log(`\nWritten to ${OUT_FILE}`);
  }
}

main();
