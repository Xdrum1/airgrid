/**
 * RiskIndex — Site-level risk assessment for heliports/vertiports.
 *
 * Composition layer over existing data:
 *  - Heliport (NASR 5010 metadata)
 *  - HeliportCompliance (5-question framework, per-site scoring)
 *  - OeaaaDetermination (FAA airspace determinations when present)
 *  - MCS state context (regulatory burden + posture)
 *  - FKB city posture (tracked-market-only)
 *
 * Output: 4-tier risk classification + gap flags + qualitative exposure note.
 * Used by /reports/risk-assessment/[siteId] (admin-gated demo surface).
 */
import { prisma } from "@/lib/prisma";
import { getStateContext, type StateContext } from "@/lib/mcs";
import { getCitiesWithOverrides } from "@/data/seed";
import type { City } from "@/types";

export type RiskTier = "LOW" | "MODERATE" | "ELEVATED" | "CRITICAL";

export interface SiteGapFlag {
  code: string;
  severity: "low" | "moderate" | "high" | "critical";
  title: string;
  detail: string;
}

export interface SiteRiskAssessment {
  // Source
  facilityId: string;
  facilityName: string;
  city: string;
  state: string;
  county: string | null;
  lat: number;
  lng: number;
  ownershipType: string;
  useType: string;
  siteType: string | null;

  // Tracked market linkage (null if site is not in an AirIndex tracked metro)
  marketCity: City | null;

  // Scoring
  riskTier: RiskTier;
  riskScore: number; // 0-100, higher = more risk
  riskColor: string;

  // Compliance (HeliportCompliance row)
  complianceStatus: string;
  complianceScore: number;
  complianceFlags: number;
  q1FaaRegistration: string;
  q2AirspaceDetermination: string;
  q2DeterminationType: string | null;
  q3StateEnforcement: string;
  q4Nfpa418: string;
  q5EvtolViability: string;

  // State context
  stateContext: StateContext | null;

  // Derived
  gapFlags: SiteGapFlag[];
  exposureNote: string;
  oeDeterminationCount: number;
  lastAssessedAt: Date | null;
}

// ─────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────

function tierFromScore(score: number): RiskTier {
  if (score >= 70) return "CRITICAL";
  if (score >= 50) return "ELEVATED";
  if (score >= 25) return "MODERATE";
  return "LOW";
}

export function tierColor(tier: RiskTier): string {
  switch (tier) {
    case "CRITICAL": return "#ff5470";
    case "ELEVATED": return "#f59e0b";
    case "MODERATE": return "#3b82f6";
    case "LOW": return "#10b981";
  }
}

/**
 * Risk score: 0-100, higher = more risk. Weighted:
 *  - Compliance gaps       40 pts (8 per failed/unknown question)
 *  - State regulatory burden  25 pts (severe=25, high=18, moderate=10, low=4)
 *  - Q2 airspace-determination flag  20 pts (objectionable=20, unknown=10, concur=0)
 *  - Q5 eVTOL viability (forward risk)  15 pts (at_risk=15, unknown=6, viable=0)
 */
function computeRiskScore(params: {
  complianceScore: number;   // 0-5 passing
  q1: string; q2: string; q2Det: string | null;
  q3: string; q4: string; q5: string;
  burdenLevel: string | null;
}): number {
  let score = 0;

  // Compliance — each non-pass question contributes
  const qVals = [params.q1, params.q2, params.q3, params.q4, params.q5];
  for (const v of qVals) {
    if (v === "unknown" || v === "flag" || v === "missing" || v === "not_found" ||
        v === "none" || v === "at_risk") score += 8;
  }

  // Q2 airspace determination specifics
  if (params.q2Det === "objectionable") score += 20;
  else if (params.q2 === "unknown") score += 10;

  // State burden
  switch (params.burdenLevel) {
    case "severe": score += 25; break;
    case "high": score += 18; break;
    case "moderate": score += 10; break;
    case "low": score += 4; break;
  }

  // Q5 forward risk (eVTOL dimensional viability) — insurance-relevant
  if (params.q5 === "at_risk") score += 15;
  else if (params.q5 === "unknown") score += 6;

  return Math.min(100, Math.max(0, Math.round(score)));
}

function buildGapFlags(c: {
  q1FaaRegistration: string;
  q2AirspaceDetermination: string;
  q2DeterminationType: string | null;
  q3StateEnforcement: string;
  q4Nfpa418: string;
  q5EvtolViability: string;
  burdenLevel: string | null;
  burdenNote: string | null;
  stateCode: string;
}): SiteGapFlag[] {
  const flags: SiteGapFlag[] = [];

  if (c.q2DeterminationType === "objectionable") {
    flags.push({
      code: "OE_OBJECTIONABLE",
      severity: "critical",
      title: "FAA determination: Objectionable",
      detail: "A current FAA airspace determination on record is Objectionable. Operations may be restricted; remediation typically requires a new airspace study.",
    });
  } else if (c.q2AirspaceDetermination === "unknown" || c.q2AirspaceDetermination === "not_found") {
    flags.push({
      code: "OE_MISSING",
      severity: "high",
      title: "No FAA airspace determination on file",
      detail: "No current 7460-1 determination found linked to this facility. Insurance exposure is ambiguous — recommend verification before next renewal.",
    });
  }

  if (c.q1FaaRegistration === "flag" || c.q1FaaRegistration === "missing") {
    flags.push({
      code: "FAA_REG_GAP",
      severity: "high",
      title: "FAA registration incomplete or flagged",
      detail: "NASR 5010 record shows registration discrepancy. Verify operator-of-record and facility status before coverage renewal.",
    });
  }

  if (c.q5EvtolViability === "at_risk") {
    flags.push({
      code: "EVTOL_VIABILITY",
      severity: "moderate",
      title: "eVTOL dimensional viability at risk",
      detail: "Current TLOF/FATO dimensions are unlikely to accommodate certificated eVTOL aircraft without modification. Forward-looking capex risk.",
    });
  }

  if (c.q4Nfpa418 === "none") {
    flags.push({
      code: "NFPA_418",
      severity: "moderate",
      title: "NFPA 418 not adopted in jurisdiction",
      detail: "Local jurisdiction has not adopted NFPA 418 heliport fire safety code. Elevated fire-suppression and fueling-risk exposure.",
    });
  } else if (c.q4Nfpa418 === "unknown") {
    flags.push({
      code: "NFPA_418_UNKNOWN",
      severity: "low",
      title: "NFPA 418 adoption status unknown",
      detail: "Jurisdiction's NFPA 418 adoption has not been confirmed. Recommend verification during site audit.",
    });
  }

  if (c.q3StateEnforcement === "strong") {
    // Strong enforcement is actually good for insurers (lower exposure). No flag.
  } else if (c.q3StateEnforcement === "none") {
    flags.push({
      code: "STATE_ENFORCEMENT_WEAK",
      severity: "low",
      title: "No state-level aviation enforcement",
      detail: `${c.stateCode} has no dedicated state aviation enforcement. All compliance rests on FAA and local authorities.`,
    });
  }

  if (c.burdenLevel === "severe") {
    flags.push({
      code: "BURDEN_SEVERE",
      severity: "high",
      title: "Severe state regulatory burden",
      detail: c.burdenNote ?? "State permitting regime is documented as severe. Extended remediation timelines impact premium collection and insured-value schedules.",
    });
  } else if (c.burdenLevel === "high") {
    flags.push({
      code: "BURDEN_HIGH",
      severity: "moderate",
      title: "High state regulatory burden",
      detail: c.burdenNote ?? "State permitting regime adds significant documentation overhead. Plan for extended remediation timelines.",
    });
  }

  return flags;
}

function buildExposureNote(
  tier: RiskTier,
  flags: SiteGapFlag[],
  burdenLevel: string | null,
  stateCode: string,
): string {
  const topCodes = flags.map((f) => f.code);
  const severe = burdenLevel === "severe" || burdenLevel === "high";

  if (tier === "CRITICAL") {
    return `Critical risk posture. ${flags.length} active compliance gaps including ${topCodes.slice(0, 2).join(", ")}. ${severe ? `${stateCode} burden amplifies remediation timeline. ` : ""}Recommend site-level audit and coverage-condition review before renewal.`;
  }
  if (tier === "ELEVATED") {
    return `Elevated exposure. Compliance gaps (${topCodes.slice(0, 2).join(", ")}) combined with ${burdenLevel ?? "unknown"} state burden suggest extended remediation timeline affecting premium structure and insured-value schedules.`;
  }
  if (tier === "MODERATE") {
    return `Moderate exposure. Facility shows partial compliance with documented gaps${flags.length ? ` (${topCodes.slice(0, 1).join(", ")})` : ""}. Remediation straightforward but should be documented before next renewal.`;
  }
  return `Low exposure. Facility presents clean compliance profile with no material open gaps. Suitable for standard coverage terms.`;
}

// ─────────────────────────────────────────────────────────
// Public entry
// ─────────────────────────────────────────────────────────

export async function getSiteRiskAssessment(siteId: string): Promise<SiteRiskAssessment | null> {
  const heliport = await prisma.heliport.findUnique({ where: { id: siteId } });
  if (!heliport) return null;

  const compliance = await prisma.heliportCompliance.findUnique({
    where: { facilityId: siteId },
  });

  const stateCtx = await getStateContext(heliport.state);

  const oeCount = await prisma.oeaaaDetermination.count({
    where: { linkedHeliportId: siteId },
  });

  let marketCity: City | null = null;
  if (heliport.cityId) {
    const cities = await getCitiesWithOverrides();
    marketCity = cities.find((c) => c.id === heliport.cityId) ?? null;
  }

  // Compliance defaults if no row (unlikely for demo set but safe)
  const q1 = compliance?.q1FaaRegistration ?? "unknown";
  const q2 = compliance?.q2AirspaceDetermination ?? "unknown";
  const q2Det = compliance?.q2DeterminationType ?? null;
  const q3 = compliance?.q3StateEnforcement ?? "unknown";
  const q4 = compliance?.q4Nfpa418 ?? "unknown";
  const q5 = compliance?.q5EvtolViability ?? "unknown";

  const riskScore = computeRiskScore({
    complianceScore: compliance?.complianceScore ?? 0,
    q1, q2, q2Det, q3, q4, q5,
    burdenLevel: stateCtx?.regulatoryBurdenLevel ?? null,
  });
  const riskTier = tierFromScore(riskScore);

  const gapFlags = buildGapFlags({
    q1FaaRegistration: q1,
    q2AirspaceDetermination: q2,
    q2DeterminationType: q2Det,
    q3StateEnforcement: q3,
    q4Nfpa418: q4,
    q5EvtolViability: q5,
    burdenLevel: stateCtx?.regulatoryBurdenLevel ?? null,
    burdenNote: stateCtx?.regulatoryBurdenNote ?? null,
    stateCode: heliport.state,
  }).sort((a, b) => {
    const ord = { critical: 0, high: 1, moderate: 2, low: 3 } as const;
    return ord[a.severity] - ord[b.severity];
  });

  const exposureNote = buildExposureNote(
    riskTier,
    gapFlags,
    stateCtx?.regulatoryBurdenLevel ?? null,
    heliport.state,
  );

  return {
    facilityId: heliport.id,
    facilityName: heliport.facilityName,
    city: heliport.city,
    state: heliport.state,
    county: heliport.county,
    lat: heliport.lat,
    lng: heliport.lng,
    ownershipType: heliport.ownershipType,
    useType: heliport.useType,
    siteType: compliance?.siteType ?? null,

    marketCity,

    riskTier,
    riskScore,
    riskColor: tierColor(riskTier),

    complianceStatus: compliance?.complianceStatus ?? "unknown",
    complianceScore: compliance?.complianceScore ?? 0,
    complianceFlags: compliance?.flagCount ?? 0,
    q1FaaRegistration: q1,
    q2AirspaceDetermination: q2,
    q2DeterminationType: q2Det,
    q3StateEnforcement: q3,
    q4Nfpa418: q4,
    q5EvtolViability: q5,

    stateContext: stateCtx,

    gapFlags,
    exposureNote,
    oeDeterminationCount: oeCount,
    lastAssessedAt: compliance?.lastAssessedAt ?? null,
  };
}

// Demo-set allowlist for admin-gated discovery
export const RISK_DEMO_SITE_IDS = [
  // FL — severe burden
  "25FA", "1FD5", "61FL", "04FD", "37FA", "FA61", "6FL1", "6FD8",
  // CA — high burden
  "CA46", "75CL", "18CN", "15CA", "CN10", "7CL1", "CA95",
];
