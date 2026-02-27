/**
 * Rules Engine — maps ingested records to scoring override candidates.
 *
 * 5 explicit rules:
 * 1. State bill signed → hasStateLegislation = true (high confidence)
 * 2. Vertiport zoning bill signed → hasVertiportZoning = true (medium)
 * 3. FAA corridor/cert filing → regulatoryPosture flag (needs_review)
 * 4. Operator 8-K filing → flag for manual review (needs_review)
 * 5. FAA cert milestone in 8-K → hasActivePilotProgram = true (medium)
 */

import type { IngestedRecord } from "@/lib/ingestion";
import { OPERATORS } from "@/data/seed";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface OverrideCandidate {
  cityId: string;
  field: string;
  value: unknown;
  reason: string;
  sourceRecordId: string;
  sourceUrl: string;
  confidence: "high" | "medium" | "needs_review";
}

// -------------------------------------------------------
// State → city mapping
// -------------------------------------------------------

const STATE_TO_CITIES: Record<string, string[]> = {
  CA: ["los_angeles", "san_diego", "san_francisco"],
  TX: ["dallas", "houston", "austin"],
  FL: ["miami", "orlando"],
  NY: ["new_york"],
  AZ: ["phoenix"],
  NV: ["las_vegas"],
  IL: ["chicago"],
  GA: ["atlanta"],
};

// -------------------------------------------------------
// Keyword patterns
// -------------------------------------------------------

const UAM_KEYWORDS = /evtol|vtol|powered.lift|vertiport|air.taxi|air.mobility|urban.air|advanced.air|aam\b|uas\b|unmanned.aircraft|drone/i;
const SIGNED_STATUS = /signed|enacted|passed|chaptered|approved by governor/i;
const ZONING_KEYWORDS = /zoning|land.use|vertiport.sit|heliport.permit/i;
const CORRIDOR_KEYWORDS = /corridor|airway|route.auth|airspace.design|powered.lift.operations/i;
const CERT_KEYWORDS = /type.cert|airworthiness|part.135|part.21|sfar|special.condition/i;
const FAA_CERT_8K_KEYWORDS = /faa.cert|type.certificate|airworthiness|part.135|powered.lift|milestone|approved/i;

// -------------------------------------------------------
// Operator → cities mapping (from seed data)
// -------------------------------------------------------

function getOperatorCities(operatorId: string): string[] {
  const op = OPERATORS.find((o) => o.id === operatorId);
  return op?.activeMarkets ?? [];
}

// -------------------------------------------------------
// Rule evaluation
// -------------------------------------------------------

function evaluateRecord(record: IngestedRecord): OverrideCandidate[] {
  const candidates: OverrideCandidate[] = [];
  const text = `${record.title} ${record.summary}`.toLowerCase();

  // Rule 1: State bill signed → hasStateLegislation = true
  if (
    record.source === "legiscan" &&
    SIGNED_STATUS.test(record.status) &&
    UAM_KEYWORDS.test(text)
  ) {
    const state = record.state?.toUpperCase();
    const cities = state ? STATE_TO_CITIES[state] : undefined;
    if (cities) {
      for (const cityId of cities) {
        candidates.push({
          cityId,
          field: "hasStateLegislation",
          value: true,
          reason: `State bill signed: ${record.title}`,
          sourceRecordId: record.id,
          sourceUrl: record.url,
          confidence: "high",
        });
      }
    }
  }

  // Rule 2: Vertiport zoning bill signed → hasVertiportZoning = true
  if (
    record.source === "legiscan" &&
    SIGNED_STATUS.test(record.status) &&
    ZONING_KEYWORDS.test(text)
  ) {
    const state = record.state?.toUpperCase();
    const cities = state ? STATE_TO_CITIES[state] : undefined;
    if (cities) {
      for (const cityId of cities) {
        candidates.push({
          cityId,
          field: "hasVertiportZoning",
          value: true,
          reason: `Vertiport zoning bill signed: ${record.title}`,
          sourceRecordId: record.id,
          sourceUrl: record.url,
          confidence: "medium",
        });
      }
    }
  }

  // Rule 3: FAA corridor/cert Federal Register filing → regulatoryPosture flag
  if (record.source === "federal_register") {
    if (CORRIDOR_KEYWORDS.test(text) || CERT_KEYWORDS.test(text)) {
      // Can't auto-map to a specific city — flag for review
      candidates.push({
        cityId: "__unresolved__",
        field: "regulatoryPosture",
        value: "friendly",
        reason: `FAA filing may affect regulatory posture: ${record.title}`,
        sourceRecordId: record.id,
        sourceUrl: record.url,
        confidence: "needs_review",
      });
    }
  }

  // Rule 4: Operator 8-K filing → flag for manual review
  if (record.source === "sec_edgar") {
    const operatorId = (record.raw as Record<string, unknown>).operatorId as string | undefined;

    candidates.push({
      cityId: "__unresolved__",
      field: "__review__",
      value: null,
      reason: `New ${record.status} filing from ${operatorId ?? "unknown operator"}: ${record.title}`,
      sourceRecordId: record.id,
      sourceUrl: record.url,
      confidence: "needs_review",
    });

    // Rule 5: FAA cert milestone in 8-K → hasActivePilotProgram = true
    if (operatorId && FAA_CERT_8K_KEYWORDS.test(text)) {
      const cities = getOperatorCities(operatorId);
      for (const cityId of cities) {
        candidates.push({
          cityId,
          field: "hasActivePilotProgram",
          value: true,
          reason: `FAA cert milestone detected in ${operatorId} 8-K: ${record.title}`,
          sourceRecordId: record.id,
          sourceUrl: record.url,
          confidence: "medium",
        });
      }
    }
  }

  return candidates;
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

export function evaluateRules(records: IngestedRecord[]): OverrideCandidate[] {
  const candidates: OverrideCandidate[] = [];
  for (const record of records) {
    candidates.push(...evaluateRecord(record));
  }
  console.log(`[rules-engine] Evaluated ${records.length} records → ${candidates.length} override candidates`);
  return candidates;
}
