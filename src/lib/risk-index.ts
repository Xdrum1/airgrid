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
import { existsSync, readFileSync } from "fs";
import path from "path";

// Check NASR APT_RMK for rooftop indicators
let rooftopCache: Set<string> | null = null;
function isRooftopFromRemarks(siteId: string): boolean {
  if (!rooftopCache) {
    rooftopCache = new Set();
    try {
      const rmkPath = path.join(process.cwd(), "data", "nasr", "APT_RMK.csv");
      if (existsSync(rmkPath)) {
        const content = readFileSync(rmkPath, "utf-8");
        const lines = content.split("\n");
        for (const line of lines) {
          if (/rooftop|roof.top/i.test(line)) {
            // Extract all quoted fields
            const fields = line.match(/"([^"]*)"/g);
            if (fields && fields.length >= 5) {
              const id = fields[4].replace(/"/g, "");
              rooftopCache.add(id);
            }
          }
        }
      }
    } catch { /* silently skip */ }
  }
  return rooftopCache.has(siteId);
}

export type RiskTier = "LOW" | "MODERATE" | "ELEVATED" | "CRITICAL";

export interface SiteGapFlag {
  code: string;
  severity: "low" | "moderate" | "high" | "critical";
  title: string;
  detail: string;
  remediation: string | null;   // What action resolves this factor
  tierImpact: string | null;    // Expected tier movement if resolved
}

export interface UnderwritingRecommendation {
  stance: "standard" | "standard-with-conditions" | "conditional" | "decline-pending-remediation";
  summary: string;
  conditions: string[];         // Policy conditions / endorsements to attach
}

export interface DimensionalAnalysis {
  padLengthFt: number | null;
  padWidthFt: number | null;
  surfaceType: string | null;
  controllingDimension: number | null;   // min(length, width) — the TLOF / binding constraint
  estimatedOL: number | null;            // controlling dim × 1.2 (OL from RD per AC 1.8.31)
  maxDesignRD: number | null;            // = controllingDimension (TLOF = 1×RD on legacy pads)
  requiredFato15D: number | null;        // OL × 1.5 (current heliport standard)
  requiredFato2D: number | null;         // OL × 2.0 (EB-105A eVTOL requirement)
  requiredSafetyArea: number | null;     // OL × 0.28 (safety area perimeter)
  fatoGap15D: number | null;             // requiredFato15D - controllingDimension (ft beyond pad)
  fatoGap2D: number | null;              // requiredFato2D - controllingDimension (ft beyond pad)
  dataSource: "nasr_apt_rwy" | "unknown";
}

export interface PeerBenchmark {
  peerCount: number;
  betterThanPct: number;        // % of peers this site is cleaner than (higher = better)
  quartile: "top" | "upper-mid" | "lower-mid" | "bottom";
  cohortLabel: string;          // e.g. "FL hospital helipads"
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

  // Dimensional
  dimensional: DimensionalAnalysis;

  // Derived
  gapFlags: SiteGapFlag[];
  exposureNote: string;
  underwriting: UnderwritingRecommendation;
  peerBenchmark: PeerBenchmark;
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
  dimensional?: DimensionalAnalysis;
  surfaceType?: string | null;
  siteType?: string | null;
  isInTrackedMetro?: boolean;
  isRooftopFromRemarks?: boolean;
}): SiteGapFlag[] {
  const flags: SiteGapFlag[] = [];

  if (c.q2DeterminationType === "objectionable") {
    flags.push({
      code: "OE_OBJECTIONABLE",
      severity: "critical",
      title: "FAA determination: Objectionable",
      detail: "A current FAA airspace determination on record is Objectionable. Operations may be restricted; remediation typically requires a new airspace study.",
      remediation: "New 7460-1 filing with supporting obstruction evaluation. Typically 90-180 days through FAA.",
      tierImpact: "Resolving moves facility from CRITICAL toward ELEVATED; standard coverage unlikely until cleared.",
    });
  } else if (c.q2AirspaceDetermination === "unknown" || c.q2AirspaceDetermination === "not_found") {
    flags.push({
      code: "OE_MISSING",
      severity: "high",
      title: "No FAA airspace determination on file",
      detail: "No publicly accessible airspace determination letter identified for this facility; historical records may require FOIA retrieval. Insurance exposure is ambiguous — verification recommended before renewal.",
      remediation: "Facility-of-record files FAA Form 7460-1 (Notice of Proposed Construction) to initiate an airspace study; the output is an Airspace Determination Letter.",
      tierImpact: "Typical resolution drops this factor out of the file — site moves one tier toward LOW.",
    });
  }

  if (c.q1FaaRegistration === "flag" || c.q1FaaRegistration === "missing") {
    flags.push({
      code: "FAA_REG_GAP",
      severity: "high",
      title: "FAA registration incomplete or flagged",
      detail: "NASR 5010 record shows registration discrepancy. Verify operator-of-record and facility status before coverage renewal.",
      remediation: "5010 update filing via regional FAA ADO; 30-60 days typical.",
      tierImpact: "Administrative — resolves cleanly, removes factor from file.",
    });
  }

  if (c.q5EvtolViability === "at_risk") {
    const d = c.dimensional;
    const hasDims = d && d.controllingDimension != null;
    const dimDetail = hasDims
      ? `Recorded pad (TLOF): ${d.padLengthFt}×${d.padWidthFt} ft. Design helicopter RD: ${d.maxDesignRD} ft, estimated OL: ${d.estimatedOL} ft. Required FATO at 1.5D (current standard): ${d.requiredFato15D} ft — ${d.fatoGap15D! > 0 ? `${d.fatoGap15D} ft beyond pad` : "within pad"}. Required FATO at 2D (EB-105A): ${d.requiredFato2D} ft — ${d.fatoGap2D! > 0 ? `${d.fatoGap2D} ft beyond pad` : "within pad"}. Whether the surrounding site can accommodate the required FATO depends on available expansion area and obstruction environment — site-level validation required.`
      : "Most existing heliport geometries do not meet current vertiport dimensional criteria (EB-105A) without structural expansion. FATO requires 2× the controlling dimension as a load-bearing surface; most hospital rooftop pads cannot physically accommodate this increase.";
    flags.push({
      code: "EVTOL_VIABILITY",
      severity: "moderate",
      title: hasDims
        ? `eVTOL dimensional constraint — FATO (2D) requires ${d.fatoGap2D} ft beyond recorded pad`
        : "eVTOL dimensional viability at risk",
      detail: dimDetail,
      remediation: "Site modification or endorsement acknowledging current-aircraft-only coverage. Physical expansion constrained by surrounding structures at most rooftop facilities.",
      tierImpact: "Forward-looking structural constraint; does not block current-year coverage terms but signals long-term capex exposure.",
    });
  }

  if (c.q4Nfpa418 === "none") {
    flags.push({
      code: "NFPA_418",
      severity: "moderate",
      title: "NFPA 418 not adopted in jurisdiction",
      detail: "Local jurisdiction has not adopted NFPA 418 heliport fire safety code. Elevated fire-suppression and fueling-risk exposure.",
      remediation: "Facility-level adoption of NFPA 418 practices absent jurisdictional mandate; loss-control engineering endorsement.",
      tierImpact: "Resolvable via voluntary adoption; moderates fire-exposure loading.",
    });
  } else if (c.q4Nfpa418 === "unknown") {
    flags.push({
      code: "NFPA_418_UNKNOWN",
      severity: "low",
      title: "NFPA 418 adoption status unknown",
      detail: "Jurisdiction's NFPA 418 adoption has not been confirmed. Recommend verification during site audit.",
      remediation: "AirIndex verification pass against local fire code — typically same-week turnaround.",
      tierImpact: "Low-weight factor; confirmation usually clarifies rather than moves tier.",
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
      remediation: "Not remediable at facility level — underwriting consideration only.",
      tierImpact: "Structural. Informs pricing, not tier movement.",
    });
  }

  if (c.burdenLevel === "severe") {
    flags.push({
      code: "BURDEN_SEVERE",
      severity: "high",
      title: "Severe state regulatory burden",
      detail: c.burdenNote ?? "State permitting regime is documented as severe. Extended remediation timelines impact premium collection and insured-value schedules.",
      remediation: "Not remediable — plan for extended remediation cycles on any open factors (6-12 mo typical in FL).",
      tierImpact: "Structural; informs renewal-cycle pricing rather than tier movement.",
    });
  } else if (c.burdenLevel === "high") {
    flags.push({
      code: "BURDEN_HIGH",
      severity: "moderate",
      title: "High state regulatory burden",
      detail: c.burdenNote ?? "State permitting regime adds significant documentation overhead. Plan for extended remediation timelines.",
      remediation: "Not remediable — plan for 4-8 mo timelines on open factors.",
      tierImpact: "Structural; informs pricing.",
    });
  }

  // Airflow & ventilation exposure — rooftop facilities in urban contexts
  const isRooftop = c.surfaceType?.toUpperCase() === "ROOF-TOP" ||
    c.surfaceType?.toUpperCase() === "ROOFTOP" ||
    c.isRooftopFromRemarks === true;
  const isHospital = c.siteType === "hospital";
  const isUrban = c.isInTrackedMetro === true;

  if (isRooftop && isUrban && isHospital) {
    flags.push({
      code: "AIRFLOW_VENTILATION",
      severity: "high",
      title: "Airflow & ventilation exposure — hospital rooftop",
      detail: "Hospital rooftop configuration with likely proximity to HVAC intake systems presents elevated risk of airflow disruption and potential exhaust recirculation into occupied spaces. Surrounding structures may create localized turbulence, wind shear amplification, and constrained approach geometry. This condition may impact patient safety and operational viability. These risks are not captured in FAA compliance records or standard airspace determinations.",
      remediation: "Formal airflow and ventilation risk assessment recommended. Assess rotor wash dispersion, HVAC intake proximity, exhaust recirculation potential, and building canyon effects on approach corridors.",
      tierImpact: "May affect tier if combined with other facility-level risk factors. Informs operational risk assessment and coverage conditions.",
    });
  } else if (isRooftop && isUrban) {
    flags.push({
      code: "AIRFLOW_VENTILATION",
      severity: "moderate",
      title: "Airflow & ventilation exposure — rooftop configuration",
      detail: "Rooftop configuration with surrounding structures introduces potential airflow disruption and exhaust recirculation risk. Proximity to building systems may impact operational safety. These risks are not captured in FAA compliance records or standard airspace determinations.",
      remediation: "Site-level airflow and ventilation risk assessment recommended where applicable.",
      tierImpact: "Does not affect current tier. Informs operational risk assessment and coverage conditions for rooftop facilities.",
    });
  } else if (isRooftop) {
    flags.push({
      code: "AIRFLOW_VENTILATION",
      severity: "low",
      title: "Airflow & ventilation exposure — rooftop configuration",
      detail: "Rooftop facility. Rotor wash and exhaust dispersion characteristics differ from ground-level operations. This assessment is based on observable site configuration and does not replace a formal engineering airflow study.",
      remediation: "Site-level airflow review recommended if operational expansion planned.",
      tierImpact: "Does not affect current tier. Informational.",
    });
  }

  return flags;
}

function buildUnderwritingRecommendation(
  tier: RiskTier,
  flags: SiteGapFlag[],
): UnderwritingRecommendation {
  const criticalFlags = flags.filter((f) => f.severity === "critical");
  const highFlags = flags.filter((f) => f.severity === "high");
  const conditions: string[] = [];

  // Assemble conditions from resolvable factors
  for (const f of flags) {
    if (f.code === "OE_MISSING" || f.code === "OE_OBJECTIONABLE") {
      conditions.push("Airspace determination (7460-1) filed or current within 12 months");
    }
    if (f.code === "FAA_REG_GAP") {
      conditions.push("NASR 5010 registration reconciled and current");
    }
    if (f.code === "NFPA_418") {
      conditions.push("Voluntary NFPA 418 fire-suppression engineering acknowledged on file");
    }
    if (f.code === "EVTOL_VIABILITY") {
      conditions.push("Coverage scoped to current-certificated-aircraft operations");
    }
    if (f.code === "AIRFLOW_VENTILATION") {
      conditions.push("Site-level airflow and ventilation risk assessment documented where applicable");
    }
  }

  if (criticalFlags.length > 0 || tier === "CRITICAL") {
    return {
      stance: "decline-pending-remediation",
      summary: "Recommend decline pending remediation. One or more critical factors (objectionable FAA determination or equivalent) require resolution before acceptable coverage terms can be written.",
      conditions,
    };
  }
  if (tier === "ELEVATED") {
    return {
      stance: "conditional",
      summary: `Recommend conditional coverage. ${highFlags.length} material risk factor${highFlags.length === 1 ? "" : "s"} warrant renewal-contingent endorsements and loss-control review.`,
      conditions,
    };
  }
  if (tier === "MODERATE") {
    return {
      stance: "standard-with-conditions",
      summary: "Recommend standard terms with documentation conditions. Open factors are procedural and resolvable within a normal renewal cycle.",
      conditions,
    };
  }
  return {
    stance: "standard",
    summary: "Recommend standard coverage terms. No material open risk factors identified.",
    conditions,
  };
}

async function computePeerBenchmark(
  stateCode: string,
  siteType: string,
  myFlagCount: number,
  myComplianceScore: number,
): Promise<PeerBenchmark> {
  // Cohort = same state + same siteType (e.g. "FL hospital helipads")
  const peerTotal = await prisma.heliportCompliance.count({
    where: { state: stateCode, siteType },
  });

  if (peerTotal === 0) {
    return {
      peerCount: 0,
      betterThanPct: 0,
      quartile: "lower-mid",
      cohortLabel: `${stateCode} ${siteType} helipads`,
    };
  }

  // "Cleaner than" = lower flagCount OR same flagCount + higher complianceScore
  const cleanerThanCount = await prisma.heliportCompliance.count({
    where: {
      state: stateCode,
      siteType,
      OR: [
        { flagCount: { gt: myFlagCount } },
        { flagCount: myFlagCount, complianceScore: { lt: myComplianceScore } },
      ],
    },
  });

  const betterThanPct = Math.round((cleanerThanCount / peerTotal) * 100);
  const quartile: PeerBenchmark["quartile"] =
    betterThanPct >= 75 ? "top"
    : betterThanPct >= 50 ? "upper-mid"
    : betterThanPct >= 25 ? "lower-mid"
    : "bottom";

  const cohortLabel = `${stateCode} ${siteType} helipads`;
  return { peerCount: peerTotal, betterThanPct, quartile, cohortLabel };
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
// Dimensional pre-screen (Rex Alexander formula chain)
// ─────────────────────────────────────────────────────────
//
// TLOF ≈ helicopter RD on legacy pads.
// OL = 1.2 × RD (AC 150/5390-2C §1.8.31).
// FATO (1.5D) = 1.5 × OL — current heliport standard.
// FATO (2D)   = 2.0 × OL — EB-105A eVTOL requirement.
// Safety Area = 0.28 × OL.
//
// This is a computational pre-screen, not a definitive filter.
// Imagery validation, obstruction analysis, and site confirmation
// are required before any viability determination.

function computeDimensionalAnalysis(
  padLengthFt: number | null,
  padWidthFt: number | null,
  surfaceType: string | null,
): DimensionalAnalysis {
  if (padLengthFt == null || padWidthFt == null) {
    return {
      padLengthFt, padWidthFt, surfaceType,
      controllingDimension: null,
      maxDesignRD: null,
      estimatedOL: null,
      requiredFato15D: null,
      requiredFato2D: null,
      requiredSafetyArea: null,
      fatoGap15D: null,
      fatoGap2D: null,
      dataSource: "unknown",
    };
  }

  const controllingDimension = Math.min(padLengthFt, padWidthFt);
  // TLOF = 1×RD on legacy pads; RD is the controlling dimension
  const maxDesignRD = controllingDimension;
  // OL = 1.2 × RD (AC 150/5390-2C §1.8.31)
  const estimatedOL = Math.round(controllingDimension * 1.2 * 10) / 10;
  const requiredFato15D = Math.round(estimatedOL * 1.5 * 10) / 10;
  const requiredFato2D = Math.round(estimatedOL * 2.0 * 10) / 10;
  const requiredSafetyArea = Math.round(estimatedOL * 0.28 * 10) / 10;
  // How much FATO extends beyond the pad — the expansion gap
  const fatoGap15D = Math.round((requiredFato15D - controllingDimension) * 10) / 10;
  const fatoGap2D = Math.round((requiredFato2D - controllingDimension) * 10) / 10;

  return {
    padLengthFt, padWidthFt, surfaceType,
    controllingDimension,
    maxDesignRD,
    estimatedOL,
    requiredFato15D,
    requiredFato2D,
    requiredSafetyArea,
    fatoGap15D,
    fatoGap2D,
    dataSource: "nasr_apt_rwy",
  };
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

  const dimensional = computeDimensionalAnalysis(
    heliport.padLengthFt,
    heliport.padWidthFt,
    heliport.surfaceType,
  );

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
    dimensional,
    surfaceType: heliport.surfaceType,
    siteType: compliance?.siteType ?? null,
    isInTrackedMetro: !!heliport.cityId,
    isRooftopFromRemarks: isRooftopFromRemarks(heliport.id),
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

  const underwriting = buildUnderwritingRecommendation(riskTier, gapFlags);

  const peerBenchmark = await computePeerBenchmark(
    heliport.state,
    compliance?.siteType ?? "other",
    compliance?.flagCount ?? 0,
    compliance?.complianceScore ?? 0,
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

    dimensional,
    gapFlags,
    exposureNote,
    underwriting,
    peerBenchmark,
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
