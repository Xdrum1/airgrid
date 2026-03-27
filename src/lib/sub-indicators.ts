/**
 * Sub-Indicator Registry + Peer Comparison Logic
 *
 * 20 sub-indicators across 7 scoring factors.
 * Sub-indicators explain and diagnose scores — they do NOT change them.
 */

import { City, ScoreBreakdown, SubIndicator, SubIndicatorStatus } from "@/types";

// -------------------------------------------------------
// Canonical registry: IDs + labels per scoring factor
// -------------------------------------------------------

export interface SubIndicatorDef {
  id: string;
  label: string;
  factor: keyof ScoreBreakdown;
}

export const SUB_INDICATOR_DEFS: SubIndicatorDef[] = [
  // Legislation (20)
  { id: "leg_enacted_bill", label: "Enacted state UAM bill", factor: "stateLegislation" },
  { id: "leg_active_bill", label: "Active bill in current session", factor: "stateLegislation" },
  { id: "leg_federal_alignment", label: "Federal preemption risk low", factor: "stateLegislation" },

  // Pilot Program (15)
  { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", factor: "activePilotProgram" },
  { id: "pilot_demo_flights", label: "Demo flights completed", factor: "activePilotProgram" },
  { id: "pilot_municipal_commitment", label: "Municipal commitment documented", factor: "activePilotProgram" },

  // Vertiport (15)
  { id: "vp_approved_sites", label: "Approved vertiport site(s)", factor: "approvedVertiport" },
  { id: "vp_construction", label: "Vertiport under construction or built", factor: "approvedVertiport" },
  { id: "vp_planning", label: "Additional sites in planning pipeline", factor: "approvedVertiport" },

  // Operators (15)
  { id: "op_committed", label: "Operator publicly committed to market", factor: "activeOperatorPresence" },
  { id: "op_beyond_announce", label: "Operator beyond announcement stage", factor: "activeOperatorPresence" },
  { id: "op_multiple", label: "Multiple operators present", factor: "activeOperatorPresence" },

  // Zoning (15)
  { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", factor: "vertiportZoning" },
  { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", factor: "vertiportZoning" },
  { id: "zone_permitting", label: "Clear permitting pathway defined", factor: "vertiportZoning" },

  // Regulatory Posture (10)
  { id: "reg_task_force", label: "Executive order or UAM task force", factor: "regulatoryPosture" },
  { id: "reg_proactive", label: "Proactive regulatory stance", factor: "regulatoryPosture" },
  { id: "reg_engagement", label: "Community engagement process", factor: "regulatoryPosture" },

  // Weather (10)
  { id: "wx_asos", label: "ASOS/AWOS station coverage", factor: "weatherInfrastructure" },
  { id: "wx_low_alt", label: "Low-altitude weather sensing", factor: "weatherInfrastructure" },
];

// Group defs by factor for quick lookup
const DEFS_BY_FACTOR: Partial<Record<keyof ScoreBreakdown, SubIndicatorDef[]>> = {};
for (const def of SUB_INDICATOR_DEFS) {
  if (!DEFS_BY_FACTOR[def.factor]) DEFS_BY_FACTOR[def.factor] = [];
  DEFS_BY_FACTOR[def.factor]!.push(def);
}

export function getDefsForFactor(factor: keyof ScoreBreakdown): SubIndicatorDef[] {
  return DEFS_BY_FACTOR[factor] ?? [];
}

// -------------------------------------------------------
// Peer comparison: enrich peerNote fields
// -------------------------------------------------------

export function getSubIndicatorsWithPeers(
  city: City,
  allCities: City[],
): Partial<Record<keyof ScoreBreakdown, SubIndicator[]>> {
  const result: Partial<Record<keyof ScoreBreakdown, SubIndicator[]>> = {};

  const factors = Object.keys(DEFS_BY_FACTOR) as (keyof ScoreBreakdown)[];

  for (const factor of factors) {
    const defs = DEFS_BY_FACTOR[factor]!;
    const cityIndicators = city.subIndicators?.[factor] ?? [];

    const enriched: SubIndicator[] = defs.map((def) => {
      // Find city's data for this indicator, or default to unknown
      const existing = cityIndicators.find((si) => si.id === def.id);
      const indicator: SubIndicator = existing
        ? { ...existing }
        : { id: def.id, label: def.label, status: "unknown" as SubIndicatorStatus };

      // Add peer note if this city is missing/unknown and a peer has it
      if (indicator.status === "missing" || indicator.status === "unknown") {
        const peerWithIt = allCities.find((c) => {
          if (c.id === city.id) return false;
          const peerIndicators = c.subIndicators?.[factor] ?? [];
          const peerSi = peerIndicators.find((si) => si.id === def.id);
          return peerSi?.status === "achieved";
        });
        if (peerWithIt) {
          indicator.peerNote = `${peerWithIt.city} has this`;
        }
      }

      return indicator;
    });

    result[factor] = enriched;
  }

  return result;
}

// -------------------------------------------------------
// Summary stats
// -------------------------------------------------------

export interface SubIndicatorSummary {
  total: number;
  achieved: number;
  partial: number;
  missing: number;
  unknown: number;
}

export function getSubIndicatorSummary(city: City): SubIndicatorSummary {
  const summary: SubIndicatorSummary = { total: SUB_INDICATOR_DEFS.length, achieved: 0, partial: 0, missing: 0, unknown: 0 };

  if (!city.subIndicators) {
    summary.unknown = summary.total;
    return summary;
  }

  for (const def of SUB_INDICATOR_DEFS) {
    const indicators = city.subIndicators[def.factor] ?? [];
    const si = indicators.find((s) => s.id === def.id);
    if (!si) {
      summary.unknown++;
    } else {
      summary[si.status]++;
    }
  }

  return summary;
}
