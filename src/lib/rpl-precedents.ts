/**
 * RPL precedent lookup — server-side.
 *
 * Given a city, return the top regulatory precedents driving its REG and LEG
 * factor scores. Used by the city detail panel to show "your score is backed
 * by these N specific documents" and convert the RPL data asset into visible
 * evidence.
 *
 * Prioritization:
 *   1. Direct city associations (rare; analyst-flagged)
 *   2. State-level legislation where jurisdiction matches the city's state
 *   3. Federal documents (apply nationally, shown on every market)
 *
 * Sorted within each tier by significance (HIGH > MEDIUM > LOW), then by
 * publishedDate (newest first).
 */
import { CITIES } from "@/data/seed";
import { createLogger } from "@/lib/logger";

const logger = createLogger("rpl-precedents");

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export interface RplPrecedent {
  id: string;
  docType: string;
  title: string;
  shortTitle: string | null;
  issuingAuthority: string;
  publishedDate: string;       // ISO date
  momentumDirection: "POS" | "NEG" | "NEU" | "MIX";
  significance: "HIGH" | "MEDIUM" | "LOW";
  summary: string | null;
  sourceUrl: string | null;
  factorCodes: string[];       // Which factors this doc maps to (LEG, REG, etc.)
  tier: "DIRECT" | "STATE" | "FEDERAL";
  tierLabel: string;
}

const SIG_ORDER: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

// Relevance gate: RPL classification sometimes tags bills as LEG/REG based
// on UAS terminology anywhere in the title (e.g., "interfering with wildfire
// drones", "honoring fire chief"). Block obviously-off-topic rows before
// displaying. This is a coarse filter — anything with at least one UAM term
// in title or summary passes; precedent surfaced with analyst curation
// (DIRECT tier) always passes.
const UAM_TERMS = [
  "advanced air mobility", "aam", "urban air mobility", "uam",
  "evtol", "electric vertical", "powered lift", "vertiport", "vtol",
  "air taxi", "airspace", "airport", "aeronautic", "aerospace",
  "aviation", "aircraft", "helicopter", "rotorcraft",
  "unmanned aircraft", "unmanned aerial", "uas ", " uas", "drone",
  "part 135", "part 107", "laanc", "bvlos", "sfar", "faa",
  "transportation", "mobility",
];

function isUamRelevant(title: string, summary: string | null): boolean {
  const haystack = `${title} ${summary ?? ""}`.toLowerCase();
  return UAM_TERMS.some((t) => haystack.includes(t));
}

// Federal docs are selected broadly by the pipeline, so they pass isUamRelevant
// too easily (generic "aircraft" / "aviation" matches capture supersonic,
// airworthiness ADs, etc.). Require a UAM-specific term for federal surfaces.
const FEDERAL_UAM_TERMS = [
  "advanced air mobility", "aam", "urban air mobility", "uam",
  "evtol", "electric vertical", "powered lift", "vertiport", "vtol",
  "air taxi", "unmanned aircraft system", "unmanned aerial system",
  "uas ", " uas", "drone", "bvlos", "laanc", "sfar-88", "part 135",
];
function isFederalUamRelevant(title: string, summary: string | null): boolean {
  const haystack = `${title} ${summary ?? ""}`.toLowerCase();
  return FEDERAL_UAM_TERMS.some((t) => haystack.includes(t));
}

export async function getPrecedentsForCity(
  cityId: string,
  limit = 8,
): Promise<RplPrecedent[]> {
  const prisma = await getPrisma();
  const city = CITIES.find((c) => c.id === cityId);
  if (!city) return [];
  const stateCode = city.state.toUpperCase();

  try {
    // --- Tier 1: direct city associations ---
    const directAssocs = await prisma.rplDocumentCityAssociation.findMany({
      where: { cityId },
      include: {
        document: {
          include: { factorMappings: { select: { factorCode: true } } },
        },
      },
    });

    // --- Tier 2: state-level legislation ---
    const stateLeg = await prisma.rplLegislationDetail.findMany({
      where: { jurisdiction: stateCode },
      include: {
        document: {
          include: { factorMappings: { select: { factorCode: true } } },
        },
      },
    });

    // --- Tier 3: federal documents (apply nationally) ---
    // Don't sort by significance in SQL: Postgres orders string columns
    // alphabetically (MEDIUM > LOW > HIGH by character code), which would
    // invert our semantic tier. JS sort later uses SIG_ORDER.
    const federal = await prisma.rplDocument.findMany({
      where: {
        docType: { startsWith: "FEDERAL_" },
        isActive: true,
      },
      include: { factorMappings: { select: { factorCode: true } } },
      orderBy: [{ publishedDate: "desc" }],
    });

    const seen = new Set<string>();
    const toPrecedent = (
      doc: typeof federal[number],
      tier: RplPrecedent["tier"],
      tierLabel: string,
    ): RplPrecedent | null => {
      if (seen.has(doc.id)) return null;
      seen.add(doc.id);
      return {
        id: doc.id,
        docType: doc.docType,
        title: doc.title,
        shortTitle: doc.shortTitle,
        issuingAuthority: doc.issuingAuthority,
        publishedDate: doc.publishedDate.toISOString().slice(0, 10),
        momentumDirection: doc.momentumDirection as RplPrecedent["momentumDirection"],
        significance: doc.significance as RplPrecedent["significance"],
        summary: doc.summary,
        sourceUrl: doc.sourceUrl,
        factorCodes: Array.from(new Set(doc.factorMappings.map((m) => m.factorCode))),
        tier,
        tierLabel,
      };
    };

    const byTier = (ord: number) => (a: RplPrecedent, b: RplPrecedent) => {
      if (a.significance !== b.significance) {
        return ((SIG_ORDER[b.significance] ?? 0) - (SIG_ORDER[a.significance] ?? 0)) * ord;
      }
      return b.publishedDate.localeCompare(a.publishedDate);
    };

    const directList = directAssocs
      .map((a) => toPrecedent(a.document, "DIRECT", "City-specific"))
      .filter((p): p is RplPrecedent => p !== null)
      .sort(byTier(1));
    const stateList = stateLeg
      .map((s) => toPrecedent(s.document, "STATE", `${stateCode} legislation`))
      .filter((p): p is RplPrecedent => p !== null)
      .filter((p) => isUamRelevant(p.title, p.summary))
      .sort(byTier(1));
    const federalList = federal
      .map((f) => toPrecedent(f, "FEDERAL", "Federal"))
      .filter((p): p is RplPrecedent => p !== null)
      .filter((p) => isFederalUamRelevant(p.title, p.summary))
      .sort(byTier(1));

    // Balanced quotas so federal HIGH noise can't crowd out a market's own
    // state-level legislation. Direct (analyst-curated) always surfaces in
    // full; remaining slots split ~60/40 state/federal.
    const result: RplPrecedent[] = [];
    for (const d of directList) {
      if (result.length >= limit) break;
      result.push(d);
    }
    const remaining = limit - result.length;
    const stateQuota = Math.min(stateList.length, Math.ceil(remaining * 0.6));
    const federalQuota = remaining - stateQuota;
    result.push(...stateList.slice(0, stateQuota));
    result.push(...federalList.slice(0, federalQuota));
    // If state had fewer docs than quota, backfill with federal
    const backfillNeeded = limit - result.length;
    if (backfillNeeded > 0) {
      result.push(...federalList.slice(federalQuota, federalQuota + backfillNeeded));
    }

    return result;
  } catch (err) {
    logger.error("getPrecedentsForCity failed", { cityId, err });
    return [];
  }
}
