/**
 * RPL Writer — writes ingested records to RPL tables
 *
 * Called from the ingestion pipeline after records are persisted
 * to IngestedRecord. Creates/updates RplDocument, factor mappings,
 * and city associations.
 *
 * Idempotent: uses rawSignalId to detect existing RPL documents.
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("rpl-writer");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// ─────────────────────────────────────────────────────────
// Document Type Classification
// ─────────────────────────────────────────────────────────

function classifyDocType(source: string, title: string, eventType: string | null): string {
  const t = title.toLowerCase();

  if (source === "federal_register") {
    if (t.includes("final rule") || t.includes("amendment")) return "FEDERAL_RULE";
    if (t.includes("proposed rule") || t.includes("notice of proposed")) return "FEDERAL_NOPR";
    if (t.includes("advisory circular")) return "FEDERAL_AC";
    if (t.includes("order") || t.includes("waiver")) return "FEDERAL_ORDER";
    return "FEDERAL_RULE";
  }

  if (source === "legiscan") {
    if (t.includes("signed") || t.includes("enacted") || t.includes("approved by governor")) return "STATE_ENACTED";
    if (t.includes("resolution")) return "STATE_RESOLUTION";
    return "STATE_BILL";
  }

  if (source === "congress_gov") {
    if (t.includes("hearing") || t.includes("testimony")) return "FEDERAL_HEARING";
    if (t.includes("markup") || t.includes("reported")) return "FEDERAL_MARKUP";
    if (t.includes("appropriation") || t.includes("funding")) return "FEDERAL_APPROPRIATION";
    return "FEDERAL_BILL";
  }

  if (source === "regulations_gov") {
    if (t.includes("proposed rule")) return "FEDERAL_NOPR";
    return "FEDERAL_RULE";
  }

  if (source === "sec_edgar") return "FEDERAL_RULE";

  if (source === "operator_news") {
    if (eventType?.includes("legislation")) return "STATE_BILL";
    if (eventType?.includes("pilot_program")) return "FEDERAL_ORDER";
    return "FEDERAL_RULE";
  }

  return "FEDERAL_RULE";
}

// ─────────────────────────────────────────────────────────
// Momentum Direction
// ─────────────────────────────────────────────────────────

function assessMomentum(title: string, eventType: string | null): string {
  const t = title.toLowerCase();

  if (t.includes("signed into law") || t.includes("enacted") || t.includes("approved")) return "POS";
  if (t.includes("launch") || t.includes("partnership") || t.includes("agreement")) return "POS";
  if (t.includes("pilot program") || t.includes("demonstration")) return "POS";
  if (t.includes("funding") || t.includes("appropriation") || t.includes("grant")) return "POS";
  if (t.includes("certification") || t.includes("authorized")) return "POS";
  if (t.includes("expansion") || t.includes("deployment")) return "POS";

  if (t.includes("moratorium") || t.includes("ban") || t.includes("restrict")) return "NEG";
  if (t.includes("oppose") || t.includes("reject") || t.includes("delay")) return "NEG";
  if (t.includes("accident") || t.includes("crash") || t.includes("incident")) return "NEG";
  if (t.includes("withdraw") || t.includes("cancel") || t.includes("suspend")) return "NEG";

  if (t.includes("amendment") || t.includes("revision")) return "MIX";

  if (eventType?.includes("positive") || eventType?.includes("expansion")) return "POS";
  if (eventType?.includes("negative") || eventType?.includes("restriction")) return "NEG";

  return "NEU";
}

// ─────────────────────────────────────────────────────────
// Significance
// ─────────────────────────────────────────────────────────

function assessSignificance(source: string, confidence: string | null, docType: string): string {
  if (docType === "STATE_ENACTED" || docType === "FEDERAL_RULE") return "HIGH";
  if (docType === "FEDERAL_APPROPRIATION" || docType === "FEDERAL_HEARING") return "HIGH";
  if (docType === "FEDERAL_NOPR" || docType === "FEDERAL_MARKUP") return "MEDIUM";
  if (confidence === "high") return "MEDIUM";
  return "LOW";
}

// ─────────────────────────────────────────────────────────
// Issuing Authority
// ─────────────────────────────────────────────────────────

function getAuthority(source: string, docType: string): string {
  if (docType.startsWith("FEDERAL_")) {
    if (source === "congress_gov") return "U.S. Congress";
    if (source === "regulations_gov") return "FAA";
    if (source === "sec_edgar") return "SEC";
    return "FAA";
  }
  if (docType.startsWith("STATE_")) return "State Legislature";
  return "Various";
}

// ─────────────────────────────────────────────────────────
// Factor Mapping
// ─────────────────────────────────────────────────────────

const EVENT_TO_FACTORS: Record<string, { code: string; type: string }[]> = {
  state_legislation_signed: [{ code: "LEG", type: "PRIMARY" }],
  state_legislation_introduced: [{ code: "LEG", type: "PRIMARY" }],
  state_legislation_advanced: [{ code: "LEG", type: "PRIMARY" }],
  state_legislation_enacted: [{ code: "LEG", type: "PRIMARY" }],
  vertiport_zoning_approved: [{ code: "ZON", type: "PRIMARY" }, { code: "VRT", type: "SECONDARY" }],
  vertiport_development: [{ code: "VRT", type: "PRIMARY" }],
  infrastructure_development: [{ code: "VRT", type: "PRIMARY" }],
  faa_corridor_filing: [{ code: "REG", type: "PRIMARY" }],
  regulatory_posture_change: [{ code: "REG", type: "PRIMARY" }],
  faa_rulemaking: [{ code: "REG", type: "PRIMARY" }],
  faa_update: [{ code: "REG", type: "PRIMARY" }],
  operator_market_expansion: [{ code: "OPR", type: "PRIMARY" }],
  operator_announcement: [{ code: "OPR", type: "PRIMARY" }],
  operator_certification: [{ code: "OPR", type: "PRIMARY" }, { code: "REG", type: "SECONDARY" }],
  pilot_program_launch: [{ code: "PLT", type: "PRIMARY" }, { code: "REG", type: "SECONDARY" }],
  pilot_program_update: [{ code: "PLT", type: "PRIMARY" }],
  weather_infrastructure: [{ code: "WTH", type: "PRIMARY" }],
  not_relevant: [],
};

function factorsFromDocType(docType: string): { code: string; type: string }[] {
  switch (docType) {
    case "FEDERAL_RULE": return [{ code: "REG", type: "PRIMARY" }];
    case "FEDERAL_NOPR": return [{ code: "REG", type: "PRIMARY" }];
    case "FEDERAL_AC": return [{ code: "REG", type: "PRIMARY" }];
    case "FEDERAL_ORDER": return [{ code: "REG", type: "PRIMARY" }];
    case "FEDERAL_HEARING": return [{ code: "LEG", type: "SECONDARY" }, { code: "REG", type: "PRIMARY" }];
    case "FEDERAL_MARKUP": return [{ code: "LEG", type: "PRIMARY" }];
    case "FEDERAL_BILL": return [{ code: "LEG", type: "PRIMARY" }];
    case "FEDERAL_APPROPRIATION": return [{ code: "LEG", type: "PRIMARY" }, { code: "PLT", type: "SECONDARY" }];
    case "STATE_BILL": return [{ code: "LEG", type: "PRIMARY" }];
    case "STATE_ENACTED": return [{ code: "LEG", type: "PRIMARY" }];
    case "STATE_RESOLUTION": return [{ code: "LEG", type: "SECONDARY" }];
    default: return [{ code: "REG", type: "SECONDARY" }];
  }
}

// ─────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────

interface RplWriteInput {
  recordId: string;
  source: string;
  title: string;
  summary: string;
  url: string;
  date: string;
  eventType?: string | null;
  confidence?: string | null;
  affectedCities?: string[];
}

interface RplWriteResult {
  documentsCreated: number;
  documentsUpdated: number;
  factorMappingsCreated: number;
  cityAssociationsCreated: number;
}

/**
 * Write a batch of ingested records to RPL.
 * Idempotent — uses rawSignalId to skip existing documents.
 */
export async function writeToRpl(records: RplWriteInput[]): Promise<RplWriteResult> {
  const prisma = await getPrisma();
  const result: RplWriteResult = {
    documentsCreated: 0,
    documentsUpdated: 0,
    factorMappingsCreated: 0,
    cityAssociationsCreated: 0,
  };

  if (records.length === 0) return result;

  // Get valid market IDs for city association validation
  const markets = await prisma.market.findMany({ select: { id: true } });
  const marketIds = new Set(markets.map(m => m.id));

  // RPL is a regulatory precedent library — scope it to sources that actually
  // produce regulatory documents. Operator news (stock chatter, trade mags) and
  // SEC filings (corporate disclosures) are not precedents; routing them through
  // here pollutes significance tiers and breaks the cite-a-precedent BD story.
  const RPL_SOURCES = new Set([
    "federal_register",
    "legiscan",
    "congress_gov",
    "regulations_gov",
  ]);

  for (const record of records) {
    try {
      if (!RPL_SOURCES.has(record.source)) continue;

      const docType = classifyDocType(record.source, record.title, record.eventType ?? null);
      const momentum = assessMomentum(record.title, record.eventType ?? null);
      const significance = assessSignificance(record.source, record.confidence ?? null, docType);
      const authority = getAuthority(record.source, docType);

      const publishedDate = new Date(record.date || new Date().toISOString());

      // Upsert the RPL document
      const existing = await prisma.rplDocument.findFirst({
        where: { rawSignalId: record.recordId },
      });

      let rplDocId: string;

      if (existing) {
        // Update momentum/significance if they changed
        await prisma.rplDocument.update({
          where: { id: existing.id },
          data: {
            momentumDirection: momentum,
            significance,
            summary: record.summary || existing.summary,
          },
        });
        rplDocId = existing.id;
        result.documentsUpdated++;
      } else {
        const doc = await prisma.rplDocument.create({
          data: {
            docType,
            title: record.title.slice(0, 500),
            shortTitle: record.title.slice(0, 200),
            issuingAuthority: authority,
            publishedDate,
            momentumDirection: momentum,
            significance,
            summary: record.summary || null,
            sourceUrl: record.url || null,
            rawSignalId: record.recordId,
            isActive: true,
          },
        });
        rplDocId = doc.id;
        result.documentsCreated++;
      }

      // Factor mappings (only for new documents)
      if (!existing) {
        let factorMaps = record.eventType
          ? EVENT_TO_FACTORS[record.eventType] ?? []
          : [];
        if (factorMaps.length === 0) {
          factorMaps = factorsFromDocType(docType);
        }

        for (const fm of factorMaps) {
          await prisma.rplDocumentFactorMapping.create({
            data: {
              documentId: rplDocId,
              factorCode: fm.code,
              mappingType: fm.type,
            },
          });
          result.factorMappingsCreated++;
        }
      }

      // City associations (only for new documents with resolved cities)
      if (!existing && record.affectedCities && record.affectedCities.length > 0) {
        for (const cityId of record.affectedCities) {
          if (!marketIds.has(cityId)) continue;

          // Skip duplicates
          const existingAssoc = await prisma.rplDocumentCityAssociation.findUnique({
            where: { documentId_cityId: { documentId: rplDocId, cityId } },
          });
          if (existingAssoc) continue;

          await prisma.rplDocumentCityAssociation.create({
            data: {
              documentId: rplDocId,
              cityId,
              associationType: docType.startsWith("STATE_") ? "STATE_APPLIES" : "DIRECTLY_NAMES",
              scoringWeight: 1.0,
            },
          });
          result.cityAssociationsCreated++;
        }
      }

      // Legislation details for state bills (new documents only)
      if (!existing && (docType === "STATE_BILL" || docType === "STATE_ENACTED" || docType === "STATE_RESOLUTION")) {
        const jurisdiction = extractState(record.title);
        const billNumber = extractBillNumber(record.title);

        await prisma.rplLegislationDetail.create({
          data: {
            documentId: rplDocId,
            jurisdiction,
            billNumber,
            chamber: billNumber.toUpperCase().startsWith("S") ? "SENATE" : "HOUSE",
            session: "2025-2026",
            currentStage: extractStage(record.title, momentum),
            lastActionDate: publishedDate,
            enactedDate: docType === "STATE_ENACTED" ? publishedDate : null,
          },
        }).catch(() => {
          // Legislation detail may already exist (unique constraint on documentId)
        });
      }
    } catch (err) {
      logger.error(`Failed to write RPL for record ${record.recordId}: ${err}`);
    }
  }

  logger.info(
    `RPL write: ${result.documentsCreated} created, ${result.documentsUpdated} updated, ` +
    `${result.factorMappingsCreated} factor mappings, ${result.cityAssociationsCreated} city associations`
  );

  return result;
}

// ─────────────────────────────────────────────────────────
// Helpers (extracted from seed script)
// ─────────────────────────────────────────────────────────

const STATE_PATTERNS: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

function extractState(title: string): string {
  const t = title.toLowerCase();
  for (const [name, code] of Object.entries(STATE_PATTERNS)) {
    if (t.includes(name)) return code;
  }
  const match = title.match(/\b([A-Z]{2})\b/);
  if (match && Object.values(STATE_PATTERNS).includes(match[1])) return match[1];
  return "US";
}

function extractBillNumber(title: string): string {
  const patterns = [
    /\b(SB|HB|AB|SJR|HJR|SCR|HCR)\s*(\d+)\b/i,
    /\b(S|HR|H\.?R\.?)\s*\.?\s*(\d+)\b/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return `${m[1].toUpperCase()} ${m[2]}`;
  }
  return "Unknown";
}

function extractStage(title: string, momentum: string): string {
  const t = title.toLowerCase();
  if (t.includes("signed") || t.includes("enacted") || t.includes("approved by governor")) return "ENACTED";
  if (t.includes("enrolled") || t.includes("engrossed")) return "ENROLLED";
  if (t.includes("passed") || t.includes("adopted")) return "PASSED_CHAMBER";
  if (t.includes("committee") || t.includes("referred")) return "IN_COMMITTEE";
  if (t.includes("vetoed")) return "VETOED";
  if (t.includes("dead") || t.includes("failed") || t.includes("tabled")) return "DEAD";
  if (momentum === "POS") return "IN_COMMITTEE";
  return "INTRODUCED";
}
