/**
 * Rules Engine — maps ingested records to scoring override candidates.
 *
 * Rules:
 * 1. State bill signed → hasStateLegislation = true (high confidence)
 * 2. Vertiport zoning bill signed → hasVertiportZoning = true (medium)
 * 3. FAA corridor/cert filing → regulatoryPosture flag (needs_review)
 * 4. SEC EDGAR operator filings:
 *    4a. FAA cert milestone in 8-K → hasActivePilotProgram = true (medium)
 *    4b. Operator market expansion → activeOperatorPresence = true (medium/needs_review)
 *    4c. Infrastructure/vertiport keywords → approvedVertiport flag (needs_review)
 *    Unmatched SEC filings produce no override (no __review__ placeholders).
 */

import type { IngestedRecord } from "@/lib/ingestion";
import type { MarketLeadSignal } from "@/lib/market-leads";
import { OPERATORS, CORRIDORS, STATE_TO_CITIES } from "@/data/seed";
import { extractCityMentions, isUntrackedState } from "@/lib/us-cities-dictionary";

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

export interface CorridorEventCandidate {
  corridorId: string | null; // null = unresolved
  eventType: "status_change" | "authorization" | "suspension";
  newStatus?: string;
  reason: string;
  sourceRecordId: string;
  sourceUrl: string;
}

// STATE_TO_CITIES is now imported from seed.ts (single source of truth)

// -------------------------------------------------------
// Keyword patterns
// -------------------------------------------------------

const UAM_KEYWORDS = /evtol|vtol|powered.lift|vertiport|air.taxi|air.mobility|urban.air|advanced.air|aam\b|uas\b|unmanned.aircraft|drone.(?:airspace|corridor|delivery|integration|operations)/i;

// Pre-filter: reject ceremonial / proclamation bills before rules evaluation
const NOISE_TITLE_PATTERNS = /commemorat|commend|honoring|anniversary|memorial|designat\w*\s+(?:a\s+)?(?:day|week|month)/i;

// Criminal-code guard: bills that mention UAS/drones in a criminal-justice
// context (stalking, harassment, sentencing, etc.) are NOT UAM enabling
// legislation. Caught Apr 30 from NE LB935 — an omnibus criminal-code bill
// that mentions "operation of unmanned aircraft systems" only as part of
// stalking/swatting offenses, surfaced as a "Unknown, NE" market lead with
// aiRecommendation=ENRICH.
const CRIMINAL_CODE_CONTEXT = /\b(stalking|swatting|harassment|protection\s+order|court\s+fees|sentencing|child\s+exploitation|hearsay|paternity|criminal\s+offense|criminal\s+penalt|incentives\s+for\s+rural\s+legal|prohibited\s+content)\b/i;

export function looksLikeCriminalCodeBill(text: string): boolean {
  return CRIMINAL_CODE_CONTEXT.test(text);
}
const SIGNED_STATUS = /signed|enacted|passed|chaptered|approved by governor/i;
const ZONING_KEYWORDS = /zoning|land.use|vertiport.sit|heliport.permit/i;
const CORRIDOR_KEYWORDS = /corridor|airway|route.auth|airspace.design|powered.lift.operations/i;
const CERT_KEYWORDS = /type.cert|airworthiness|part.135|part.21|sfar|special.condition/i;
const FAA_CERT_8K_KEYWORDS = /faa.cert|type.certificate|airworthiness|part.135|powered.lift|milestone|approved/i;
const EXPANSION_KEYWORDS = /market.expansion|new.market|commercial.launch|service.launch|operations.in|commence|begin.service/i;
const INFRA_KEYWORDS = /vertiport|terminal|facility.acqui|airport.acqui|infrastructure|charging.station|ground.support/i;

// -------------------------------------------------------
// Operator → cities mapping (from seed data)
// -------------------------------------------------------

function getOperatorCities(operatorId: string): string[] {
  const op = OPERATORS.find((o) => o.id === operatorId);
  return op?.activeMarkets ?? [];
}

// Match corridor mentions by city name, airport codes, or corridor name
const CORRIDOR_NAME_PATTERNS = CORRIDORS.map((c) => ({
  id: c.id,
  pattern: new RegExp(
    [
      c.name.replace(/[–—-]/g, ".*"),
      c.startPoint.label,
      c.endPoint.label,
    ]
      .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|"),
    "i"
  ),
}));

function matchCorridor(text: string): string | null {
  for (const { id, pattern } of CORRIDOR_NAME_PATTERNS) {
    if (pattern.test(text)) return id;
  }
  return null;
}

function evaluateCorridorEvents(record: IngestedRecord): CorridorEventCandidate[] {
  const events: CorridorEventCandidate[] = [];
  const text = `${record.title} ${record.summary}`.toLowerCase();

  if (!CORRIDOR_KEYWORDS.test(text)) return events;

  const corridorId = matchCorridor(`${record.title} ${record.summary}`);

  if (record.source === "federal_register") {
    const isAuth = /authorized|approval|granted|cleared/i.test(text);
    const isSuspend = /suspended|revoked|terminated|withdrawn/i.test(text);

    events.push({
      corridorId,
      eventType: isSuspend ? "suspension" : isAuth ? "authorization" : "status_change",
      newStatus: isSuspend ? "suspended" : isAuth ? "authorized" : undefined,
      reason: `FAA corridor filing: ${record.title}`,
      sourceRecordId: record.id,
      sourceUrl: record.url,
    });
  }

  if (record.source === "legiscan" && CORRIDOR_KEYWORDS.test(text)) {
    events.push({
      corridorId,
      eventType: "status_change",
      reason: `State legislation mentions corridor: ${record.title}`,
      sourceRecordId: record.id,
      sourceUrl: record.url,
    });
  }

  return events;
}

// -------------------------------------------------------
// Rule evaluation
// -------------------------------------------------------

function evaluateRecord(record: IngestedRecord): OverrideCandidate[] {
  const candidates: OverrideCandidate[] = [];

  // Short-circuit: skip ceremonial / proclamation bills
  if (record.source === "legiscan" && NOISE_TITLE_PATTERNS.test(record.title)) {
    return candidates;
  }

  const text = `${record.title} ${record.summary}`.toLowerCase();

  // Criminal-code guard: legiscan bills that mention UAS/drones only as part
  // of criminal-offense legislation (stalking, swatting, etc.) are not UAM
  // enabling legislation and must not generate hasStateLegislation overrides.
  if (record.source === "legiscan" && looksLikeCriminalCodeBill(text)) {
    return candidates;
  }

  // Rule 1: State bill signed → stateLegislationStatus = "enacted"
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

  // Rule 4: SEC EDGAR operator filings
  if (record.source === "sec_edgar") {
    const operatorId = (record.raw as Record<string, unknown>).operatorId as string | undefined;

    // Rule 4a: FAA cert milestone in 8-K → hasActivePilotProgram = true
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

    // Rule 4b: Operator market expansion keywords → activeOperatorPresence = true
    if (operatorId && EXPANSION_KEYWORDS.test(text)) {
      const cities = getOperatorCities(operatorId);
      for (const cityId of cities.length > 0 ? cities : ["__unresolved__"]) {
        candidates.push({
          cityId,
          field: "activeOperatorPresence",
          value: true,
          reason: `Operator expansion detected in ${operatorId} 8-K: ${record.title}`,
          sourceRecordId: record.id,
          sourceUrl: record.url,
          confidence: cities.length > 0 ? "medium" : "needs_review",
        });
      }
    }

    // Rule 4c: Infrastructure/vertiport keywords → approvedVertiport flag
    if (INFRA_KEYWORDS.test(text)) {
      candidates.push({
        cityId: "__unresolved__",
        field: "approvedVertiport",
        value: true,
        reason: `Infrastructure development in ${operatorId ?? "unknown"} filing: ${record.title}`,
        sourceRecordId: record.id,
        sourceUrl: record.url,
        confidence: "needs_review",
      });
    }

    // No catch-all __review__ — unmatched SEC filings produce no override
  }

  return candidates;
}

// -------------------------------------------------------
// Auto-discovery: detect signals for untracked markets
// -------------------------------------------------------

function detectMarketLeadSignals(record: IngestedRecord): MarketLeadSignal[] {
  const signals: MarketLeadSignal[] = [];
  const text = `${record.title} ${record.summary}`;

  // Skip ceremonial bills
  if (record.source === "legiscan" && NOISE_TITLE_PATTERNS.test(record.title)) {
    return signals;
  }

  // Skip criminal-code bills that incidentally mention UAS/drones — these are
  // stalking/swatting/harassment legislation, not UAM enabling. (Apr 30: NE
  // LB935 surfaced as "Unknown, NE" lead before this guard existed.)
  if (record.source === "legiscan" && looksLikeCriminalCodeBill(text)) {
    return signals;
  }

  // Layer 2a: LegiScan bills from untracked states with UAM relevance
  if (record.source === "legiscan" && record.state) {
    const stateUpper = record.state.toUpperCase();
    if (isUntrackedState(stateUpper) && UAM_KEYWORDS.test(text)) {
      // Try to extract specific city from bill text
      const cityMentions = extractCityMentions(text);
      const stateCities = cityMentions.filter(
        (m) => m.state === stateUpper
      );

      if (stateCities.length > 0) {
        for (const mention of stateCities) {
          signals.push({
            city: mention.city,
            state: mention.state,
            source: `legiscan-${stateUpper}`,
            sourceRecordId: record.id,
            sourceUrl: record.url,
            signalText: record.title,
            signalType: SIGNED_STATUS.test(record.status)
              ? "state_legislation"
              : "news_mention",
            confidence: SIGNED_STATUS.test(record.status) ? "high" : "medium",
          });
        }
      } else {
        // Can't resolve city — create a state-level lead
        signals.push({
          city: "Unknown",
          state: stateUpper,
          source: `legiscan-${stateUpper}`,
          sourceRecordId: record.id,
          sourceUrl: record.url,
          signalText: record.title,
          signalType: SIGNED_STATUS.test(record.status)
            ? "state_legislation"
            : "news_mention",
          confidence: SIGNED_STATUS.test(record.status) ? "medium" : "low",
        });
      }
    }
  }

  // Layer 2b: Federal Register filings mentioning untracked cities
  if (record.source === "federal_register" && UAM_KEYWORDS.test(text)) {
    const cityMentions = extractCityMentions(text);
    for (const mention of cityMentions) {
      if (isUntrackedState(mention.state)) {
        signals.push({
          city: mention.city,
          state: mention.state,
          source: "federal-register",
          sourceRecordId: record.id,
          sourceUrl: record.url,
          signalText: record.title,
          signalType: "federal_filing",
          confidence: "medium",
        });
      }
    }
  }

  // Layer 3: Operator news/SEC filings mentioning untracked cities
  if (
    (record.source === "operator_news" || record.source === "sec_edgar") &&
    UAM_KEYWORDS.test(text)
  ) {
    const cityMentions = extractCityMentions(text);
    for (const mention of cityMentions) {
      signals.push({
        city: mention.city,
        state: mention.state,
        source: `${record.source}`,
        sourceRecordId: record.id,
        sourceUrl: record.url,
        signalText: record.title,
        signalType:
          EXPANSION_KEYWORDS.test(text)
            ? "operator_expansion"
            : INFRA_KEYWORDS.test(text)
              ? "infrastructure"
              : "news_mention",
        confidence: "medium",
      });
    }
  }

  return signals;
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

export function evaluateRulesV2(records: IngestedRecord[]): {
  overrideCandidates: OverrideCandidate[];
  corridorEvents: CorridorEventCandidate[];
  marketLeadSignals: MarketLeadSignal[];
} {
  const overrideCandidates: OverrideCandidate[] = [];
  const corridorEvents: CorridorEventCandidate[] = [];
  const marketLeadSignals: MarketLeadSignal[] = [];
  for (const record of records) {
    overrideCandidates.push(...evaluateRecord(record));
    corridorEvents.push(...evaluateCorridorEvents(record));
    marketLeadSignals.push(...detectMarketLeadSignals(record));
  }
  console.log(
    `[rules-engine] Evaluated ${records.length} records → ${overrideCandidates.length} override candidates, ${corridorEvents.length} corridor events, ${marketLeadSignals.length} market lead signals`
  );
  return { overrideCandidates, corridorEvents, marketLeadSignals };
}
