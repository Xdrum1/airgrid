/**
 * GET /api/internal/facility-decision/[siteId]
 *
 * Aggregates RiskIndex + DQS + OES into a single decision object.
 * Returns verdict-first response shaped for the FacilityDecisionPanel.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSiteRiskAssessment, type RiskTier } from "@/lib/risk-index";
import { getDataQuality } from "@/lib/data-quality-score";
import { loadAirflowData } from "@/lib/airflow-data";
import { computeOES, type OESBreakdown } from "@/lib/obstruction-score";

// ── Decision object types ──

export interface FacilityDecision {
  facilityId: string;
  facilityName: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  siteType: string | null;
  useType: string;

  // Verdict (top of panel)
  verdict: "viable" | "constrained" | "elevated_risk" | "critical";
  verdictLabel: string;
  verdictColor: string;
  confidence: "high" | "medium" | "low";
  primaryConstraint: string;

  // Why bullets (3-5)
  whyBullets: string[];

  // Module scores
  modules: {
    dqs: { score: number; label: string; color: string } | null;
    compliance: { status: string; label: string; color: string };
    dimensional: { status: string; label: string; color: string };
    oes: { score: number; tier: string; color: string } | null;
    oel: { level: string; label: string; color: string };
  };

  // What this means (one line)
  implication: string;

  // What to do (action items)
  actions: string[];

  // Links
  hasFullAssessment: boolean;
}

// ── Verdict derivation ──

function deriveVerdict(
  riskTier: RiskTier,
  dqsScore: number | null,
  oesBreakdown: OESBreakdown | null,
): { verdict: FacilityDecision["verdict"]; label: string; color: string } {
  // Combine signals: risk tier is primary, DQS and OES can escalate
  const oesEscalated = oesBreakdown && oesBreakdown.tier === "CRITICAL";
  const dqsVeryLow = dqsScore !== null && dqsScore < 30;

  if (riskTier === "CRITICAL" || (oesEscalated && dqsVeryLow)) {
    return { verdict: "critical", label: "Critical", color: "#dc2626" };
  }
  if (riskTier === "ELEVATED" || oesEscalated) {
    return { verdict: "elevated_risk", label: "Elevated Risk", color: "#f59e0b" };
  }
  if (riskTier === "MODERATE" || dqsVeryLow) {
    return { verdict: "constrained", label: "Constrained", color: "#f59e0b" };
  }
  return { verdict: "viable", label: "Viable", color: "#16a34a" };
}

function deriveConfidence(dqsScore: number | null, hasOes: boolean): FacilityDecision["confidence"] {
  if (dqsScore === null) return "low";
  if (dqsScore < 30 && !hasOes) return "low";
  if (dqsScore < 50 || !hasOes) return "medium";
  return "high";
}

function derivePrimaryConstraint(
  risk: Awaited<ReturnType<typeof getSiteRiskAssessment>>,
  dqs: Awaited<ReturnType<typeof getDataQuality>>,
  oes: OESBreakdown | null,
): string {
  // Pick the most severe gap flag if available
  if (risk && risk.gapFlags.length > 0) {
    const critical = risk.gapFlags.find((f) => f.severity === "critical");
    const high = risk.gapFlags.find((f) => f.severity === "high");
    const pick = critical ?? high ?? risk.gapFlags[0];
    return pick.title;
  }
  if (oes && oes.tier === "CRITICAL") return "Severe obstruction environment";
  if (oes && oes.tier === "ELEVATED") return "Airflow exposure";
  if (dqs && dqs.dqsScore < 30) return "Data quality insufficient";
  if (dqs && dqs.staleness === "very_stale") return "Data staleness";
  return "Review recommended";
}

function buildWhyBullets(
  risk: Awaited<ReturnType<typeof getSiteRiskAssessment>>,
  dqs: Awaited<ReturnType<typeof getDataQuality>>,
  oes: OESBreakdown | null,
): string[] {
  const bullets: string[] = [];

  // Site type
  if (risk?.siteType === "rooftop" || risk?.gapFlags.some((f) => f.code === "OEL_EXPOSURE")) {
    bullets.push("Rooftop facility with potential airflow exposure");
  }

  // OES specifics
  if (oes) {
    if (oes.pen81Count > 0) bullets.push(`${oes.pen81Count} structure(s) penetrate 8:1 approach surface`);
    if (oes.inFato2D > 0) bullets.push(`${oes.inFato2D} structure(s) within FATO zone`);
    if (oes.inWindPath > 0) bullets.push(`Wind path obstructed by ${oes.inWindPath} structure(s)`);
  }

  // Data staleness
  if (dqs) {
    if (dqs.staleness === "very_stale" && dqs.dataAgeYears) {
      bullets.push(`Data last updated ${dqs.dataAgeYears}+ years ago`);
    } else if (dqs.staleness === "stale" && dqs.dataAgeYears) {
      bullets.push(`Data staleness: ${dqs.dataAgeYears} years since last update`);
    }
  }

  // Compliance gaps
  if (risk) {
    if (risk.q2AirspaceDetermination === "not_found") {
      bullets.push("No airspace determination on file");
    }
    if (risk.q5EvtolViability === "unlikely") {
      bullets.push("eVTOL viability rated unlikely under current configuration");
    }
  }

  // Dimensional
  if (risk?.dimensional.fatoGap2D && risk.dimensional.fatoGap2D > 0) {
    bullets.push(`FATO 2D requires ${Math.round(risk.dimensional.fatoGap2D)} ft beyond pad edge`);
  }

  // Hospital misclassification
  if (dqs?.hospitalMisclassified) {
    bullets.push("Likely hospital facility misclassified in FAA registry");
  }

  // Cap at 5
  return bullets.slice(0, 5);
}

function buildImplication(
  verdict: FacilityDecision["verdict"],
  dqs: Awaited<ReturnType<typeof getDataQuality>>,
): string {
  if (verdict === "critical") {
    return "Significant operational risk factors identified — detailed engineering review required before any commitment.";
  }
  if (verdict === "elevated_risk") {
    return "Operational risk may not be reflected in registry data.";
  }
  if (dqs && dqs.dqsScore < 40) {
    return "Registry data insufficient for reliable assessment — field verification recommended.";
  }
  return "Site may support operations with conditions — review detailed assessment for specifics.";
}

function buildActions(
  verdict: FacilityDecision["verdict"],
  risk: Awaited<ReturnType<typeof getSiteRiskAssessment>>,
  dqs: Awaited<ReturnType<typeof getDataQuality>>,
): string[] {
  const actions: string[] = [];

  if (verdict === "critical" || verdict === "elevated_risk") {
    actions.push("Engineering site review recommended");
  }
  if (dqs && (dqs.staleness === "very_stale" || dqs.staleness === "stale")) {
    actions.push("Updated facility inspection required");
  }
  if (risk?.underwriting.stance === "conditional" || risk?.underwriting.stance === "decline-pending-remediation") {
    actions.push("Consider conditional underwriting");
  }
  if (risk?.q2AirspaceDetermination === "not_found") {
    actions.push("Verify airspace determination status");
  }

  if (actions.length === 0) {
    actions.push("Standard review — no elevated concerns identified");
  }

  return actions.slice(0, 4);
}

// ── Staleness label color ──
function stalenessColor(s: string): string {
  if (s === "current") return "#16a34a";
  if (s === "aging") return "#f59e0b";
  return "#dc2626";
}

function complianceColor(status: string): string {
  if (status === "compliant") return "#16a34a";
  if (status === "conditional") return "#f59e0b";
  return "#dc2626";
}

function complianceLabel(status: string): string {
  if (status === "compliant") return "Pass";
  if (status === "conditional") return "Partial";
  if (status === "objectionable") return "Fail";
  return "Unknown";
}

function dimensionalStatus(risk: NonNullable<Awaited<ReturnType<typeof getSiteRiskAssessment>>>): {
  status: string;
  label: string;
  color: string;
} {
  const d = risk.dimensional;
  if (!d.controllingDimension) return { status: "unknown", label: "No dimensional data", color: "#697386" };
  if (d.fatoGap2D && d.fatoGap2D > 20) return { status: "constrained", label: "Constrained", color: "#f59e0b" };
  if (d.fatoGap15D && d.fatoGap15D > 10) return { status: "limited", label: "Limited expansion", color: "#f59e0b" };
  return { status: "acceptable", label: "Acceptable", color: "#16a34a" };
}

function oelLevel(risk: NonNullable<Awaited<ReturnType<typeof getSiteRiskAssessment>>>, oes: OESBreakdown | null): {
  level: string;
  label: string;
  color: string;
} {
  const hasOel = risk.gapFlags.some((f) => f.code === "OEL_EXPOSURE");
  const oesHigh = oes && (oes.tier === "ELEVATED" || oes.tier === "CRITICAL");

  if (hasOel && oesHigh) return { level: "high", label: "High", color: "#dc2626" };
  if (hasOel || oesHigh) return { level: "moderate", label: "Moderate", color: "#f59e0b" };
  return { level: "low", label: "Low", color: "#16a34a" };
}

// ── Route handler ──

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { siteId } = await params;
  const upper = siteId.toUpperCase();

  // Run all engines in parallel
  const [risk, dqs, airflowData] = await Promise.all([
    getSiteRiskAssessment(upper),
    getDataQuality(upper),
    loadAirflowData(upper),
  ]);

  if (!risk) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  // OES only available if airflow data exists
  const oes = airflowData ? computeOES(airflowData) : null;

  const { verdict, label: verdictLabel, color: verdictColor } = deriveVerdict(
    risk.riskTier,
    dqs?.dqsScore ?? null,
    oes,
  );

  const decision: FacilityDecision = {
    facilityId: risk.facilityId,
    facilityName: risk.facilityName,
    city: risk.city,
    state: risk.state,
    lat: risk.lat,
    lng: risk.lng,
    siteType: risk.siteType,
    useType: risk.useType,

    verdict,
    verdictLabel,
    verdictColor,
    confidence: deriveConfidence(dqs?.dqsScore ?? null, oes !== null),
    primaryConstraint: derivePrimaryConstraint(risk, dqs, oes),

    whyBullets: buildWhyBullets(risk, dqs, oes),

    modules: {
      dqs: dqs
        ? {
            score: dqs.dqsScore,
            label: dqs.reliabilityLabel,
            color: stalenessColor(dqs.staleness),
          }
        : null,
      compliance: {
        status: risk.complianceStatus,
        label: complianceLabel(risk.complianceStatus),
        color: complianceColor(risk.complianceStatus),
      },
      dimensional: dimensionalStatus(risk),
      oes: oes
        ? {
            score: oes.totalScore,
            tier: oes.tier,
            color: oes.tierColor,
          }
        : null,
      oel: oelLevel(risk, oes),
    },

    implication: buildImplication(verdict, dqs),
    actions: buildActions(verdict, risk, dqs),
    hasFullAssessment: true,
  };

  return NextResponse.json(decision, {
    headers: { "Cache-Control": "private, s-maxage=60, stale-while-revalidate=120" },
  });
}
