/**
 * Heliport Data Quality Score (DQS)
 *
 * Scores the reliability of FAA NASR data for a given heliport.
 * Based on Rex Alexander's VFS Forum 80 findings (May 2024):
 *   - 99.2% of heliports have at least one blank critical field
 *   - 54.7% built before 1994 (pre-TLOF terminology)
 *   - "The database is FUBAR" for private-use (99% of all heliports)
 *
 * Reads raw NASR APT_BASE.csv fields for a facility and produces
 * a scored assessment of data staleness, completeness, and AC era.
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

export interface DataQualityAssessment {
  facilityId: string;
  activationDate: string | null;
  activationYear: number | null;
  lastInfoResponse: string | null;
  positionSourceDate: string | null;
  elevationSourceDate: string | null;
  lastInspection: string | null;
  isLikelyHospital: boolean;
  hospitalMisclassified: boolean; // matches hospital keywords but not flagged medical-use

  // Computed
  acEra: string | null;
  acVersion: string | null;
  dimensionalNote: string | null; // explains what NASR dimensions likely mean for this era
  dataAgeYears: number | null;
  blankCriticalFields: number;
  dqsScore: number; // 0-100, higher = better quality
  staleness: "current" | "aging" | "stale" | "very_stale" | "unknown";
  stalenessColor: string;
  reliabilityLabel: string;
}

interface ACEra {
  version: string;
  label: string;
  yearStart: number;
  yearEnd: number;
  dimensionalNote: string;
}

const AC_ERAS: ACEra[] = [
  { version: "Original", label: "Pre-standard (before 1959)", yearStart: 0, yearEnd: 1959, dimensionalNote: "Predates any FAA heliport design standard. Recorded dimensions have unknown basis." },
  { version: "AC 1 (1964)", label: "1959–1977", yearStart: 1959, yearEnd: 1977, dimensionalNote: "Dimensions likely refer to 'Touchdown Pad' and 'Takeoff and Landing Area' — terminology differs from modern TLOF/FATO." },
  { version: "AC 1A-1B (1977)", label: "1977–1988", yearStart: 1977, yearEnd: 1988, dimensionalNote: "Dimensions refer to 'Touchdown Pad' and 'Landing and Takeoff Area.' FATO term not yet in use." },
  { version: "AC 2 (1988)", label: "1988–1994", yearStart: 1988, yearEnd: 1994, dimensionalNote: "Dimensions use 'Touchdown Area' and introduced FATO concept. No Safety Area defined yet." },
  { version: "AC 2A (1994)", label: "1994–2004", yearStart: 1994, yearEnd: 2004, dimensionalNote: "First use of modern TLOF/FATO/Safety Area terminology. Dimensions are interpretable under current standards." },
  { version: "AC 2B (2004)", label: "2004–2012", yearStart: 2004, yearEnd: 2012, dimensionalNote: "Modern TLOF/FATO terminology. TLOF based on 1×RD (rotor diameter)." },
  { version: "AC 2C (2012)", label: "2012–2023", yearStart: 2012, yearEnd: 2023, dimensionalNote: "TLOF changed to 0.83×OL (overall length). 'D' suffix in heliport info box indicates OL, not RD." },
  { version: "AC 2D (2023)", label: "2023–present", yearStart: 2023, yearEnd: 2099, dimensionalNote: "Current standard. TLOF = 0.83×OL. Dimensions in NASR should align with current terminology." },
];

function parseNASRDate(dateStr: string | null): Date | null {
  if (!dateStr || dateStr.trim() === "" || dateStr === '""') return null;
  const clean = dateStr.replace(/"/g, "").trim();
  if (!clean) return null;
  // YYYY/MM/DD or YYYY/MM
  const parts = clean.split("/");
  if (parts.length >= 2 && parseInt(parts[0]) > 1900) {
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2] || "1"));
  }
  return null;
}

function yearsSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.round((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10;
}

// Cache the parsed CSV data
let csvCache: Map<string, Record<string, string>> | null = null;

function loadCSVCache(): Map<string, Record<string, string>> {
  if (csvCache) return csvCache;
  const csvPath = path.join(process.cwd(), "data", "nasr", "APT_BASE.csv");
  if (!existsSync(csvPath)) return new Map();

  const content = readFileSync(csvPath, "utf-8");
  const lines = content.split("\n");
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());

  csvCache = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Simple CSV parse — fields may be quoted
    const fields = line.split(",").map(f => f.replace(/"/g, "").trim());
    if (fields[headers.indexOf("SITE_TYPE_CODE")] !== "H") continue;
    const id = fields[headers.indexOf("ARPT_ID")];
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => { record[h] = fields[idx] || ""; });
    csvCache.set(id, record);
  }
  return csvCache;
}

export function getDataQuality(facilityId: string): DataQualityAssessment | null {
  const cache = loadCSVCache();
  const record = cache.get(facilityId);
  if (!record) return null;

  const activation = record["ACTIVATION_DATE"] || null;
  const lastInspection = record["LAST_INSPECTION"] || null;
  const lastInfo = record["LAST_INFO_RESPONSE"] || null;
  const posSrcDate = record["POSITION_SRC_DATE"] || null;
  const elevSrcDate = record["ELEVATION_SRC_DATE"] || null;

  // Parse activation year
  let activationYear: number | null = null;
  if (activation) {
    const match = activation.match(/(\d{4})/);
    if (match) activationYear = parseInt(match[1]);
  }

  // AC Era
  const era = activationYear
    ? AC_ERAS.find(e => activationYear! >= e.yearStart && activationYear! < e.yearEnd) ?? null
    : null;

  // Blank critical fields
  let blanks = 0;
  if (!activation) blanks++;
  if (!lastInspection) blanks++;
  if (!lastInfo) blanks++;
  if (!posSrcDate) blanks++;
  if (!elevSrcDate) blanks++;

  // Most recent date
  const dates = [lastInspection, lastInfo, posSrcDate, elevSrcDate]
    .map(d => parseNASRDate(d))
    .filter((d): d is Date => d !== null);
  const mostRecent = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
  const ageYears = yearsSince(mostRecent);

  // Staleness
  let staleness: DataQualityAssessment["staleness"] = "unknown";
  if (ageYears === null) staleness = "unknown";
  else if (ageYears <= 3) staleness = "current";
  else if (ageYears <= 7) staleness = "aging";
  else if (ageYears <= 15) staleness = "stale";
  else staleness = "very_stale";

  const stalenessColor = staleness === "current" ? "#10b981"
    : staleness === "aging" ? "#f59e0b"
    : staleness === "stale" ? "#ef4444"
    : staleness === "very_stale" ? "#991b1b"
    : "#6b7280";

  // Hospital reconciliation
  const facilityName = record["ARPT_NAME"] || "";
  const HOSPITAL_KEYWORDS = ["hospital", "medical", "health", "mercy", "memorial", "clinic", "trauma", "care", "emergency", "children", "pediatric", "veterans"];
  const isLikelyHospital = HOSPITAL_KEYWORDS.some(kw => facilityName.toLowerCase().includes(kw));
  const useCode = record["FACILITY_USE_CODE"] || "";
  const hospitalMisclassified = isLikelyHospital && !facilityName.toLowerCase().includes("medical use");

  // DQS Score (0-100)
  let dqs = 100;
  dqs -= blanks * 5;
  if (ageYears === null) dqs -= 30;
  else if (ageYears > 20) dqs -= 40;
  else if (ageYears > 10) dqs -= 30;
  else if (ageYears > 5) dqs -= 15;
  else if (ageYears > 3) dqs -= 5;
  if (!activation) dqs -= 15;
  if (era && era.yearStart < 1994) dqs -= 10;
  dqs = Math.max(0, Math.min(100, dqs));

  // Reliability label
  let reliabilityLabel: string;
  if (dqs >= 80) reliabilityLabel = "Data appears current and substantially complete.";
  else if (dqs >= 60) reliabilityLabel = "Data has minor gaps or aging fields. Verify critical dimensions against current conditions.";
  else if (dqs >= 40) reliabilityLabel = "Data reliability reduced. Multiple fields outdated or missing. Independent verification recommended.";
  else reliabilityLabel = "Data reliability is low. Significant gaps in FAA records. Dimensional and positional data should not be relied upon without independent verification.";

  return {
    facilityId,
    activationDate: activation,
    activationYear,
    lastInfoResponse: lastInfo,
    positionSourceDate: posSrcDate,
    elevationSourceDate: elevSrcDate,
    lastInspection,
    acEra: era?.label ?? null,
    acVersion: era?.version ?? null,
    dimensionalNote: era?.dimensionalNote ?? "Activation date unknown — AC era cannot be determined. Dimensional data interpretation uncertain.",
    isLikelyHospital,
    hospitalMisclassified,
    dataAgeYears: ageYears,
    blankCriticalFields: blanks,
    dqsScore: dqs,
    staleness,
    stalenessColor,
    reliabilityLabel,
  };
}
