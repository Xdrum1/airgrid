/**
 * Use Case PDF content — data-driven, single source of truth.
 * Rendered at /reports/use-case/[segment] as print-optimized pages.
 * Updates here automatically flow to the PDFs (just re-print).
 */

import { CITIES } from "@/data/seed";
import { calculateReadinessScore } from "@/lib/scoring";

// Dynamic stats computed from seed
const scores = CITIES.map((c) => calculateReadinessScore(c).score);
const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
const topScore = Math.max(...scores);
const MARKET_COUNT = CITIES.length;

export interface UseCaseStat {
  value: string;
  label: string;
  sublabel: string;
}

export interface UseCaseStep {
  step: number;
  who: string;
  action: string;
  output: string;
}

export interface UseCaseEngagement {
  product: string;
  description: string;
  access: string;
}

export interface UseCaseContent {
  segment: string;
  number: string;
  title: string;
  subtitle: string;
  color: string;        // accent color
  printColor: string;   // darker print-safe accent
  problem: string;
  intro: string;
  stats: UseCaseStat[];
  steps: UseCaseStep[];
  specialSection?: {
    title: string;
    body: string;
  };
  engagements: UseCaseEngagement[];
  cta: string;
}

export const USE_CASE_DATA: Record<string, UseCaseContent> = {
  "municipality": {
    segment: "municipality",
    number: "01",
    title: "Municipality & State Agency",
    subtitle: "How city planners and state DOTs use AirIndex to identify regulatory gaps, prioritize actions, and track readiness for commercial eVTOL operations.",
    color: "#16a34a",
    printColor: "#16a34a",
    intro: "Cities and states are making infrastructure investment decisions for Advanced Air Mobility without a clear picture of where they stand. AirIndex provides the readiness baseline, the specific regulatory gaps, and a scored roadmap showing exactly what actions move the needle \u2014 so planners can prioritize before capital is committed or operators make market decisions.",
    problem: "A state aviation director is planning the first interstate AAM corridor. The anchor city on the state side scores 25 out of 100 on AirIndex \u2014 NASCENT tier. The corridor announcement is public. Operators are evaluating where to launch. But the city\u2019s zoning ordinance doesn\u2019t define vertiport as a permitted use. The fire code doesn\u2019t reference NFPA 418. The permit process has no FAA airspace determination requirement. None of these gaps require state legislation or private capital. They require city council action. Nobody told them.",
    stats: [
      { value: String(MARKET_COUNT), label: "Markets tracked", sublabel: "Continuously updated" },
      { value: "7", label: "Scoring factors", sublabel: "Legislation, infra, ops, weather +3" },
      { value: "0\u2013100", label: "Score scale", sublabel: "NASCENT to ADVANCED" },
      { value: "5", label: "Ordinance audit questions", sublabel: "Per market, sourced to primary law" },
    ],
    steps: [
      { step: 1, who: "AirIndex", action: `Scores the market across 7 factors from 1,900+ classified regulatory documents, federal filings, and legislative records. Identifies the specific gaps suppressing the score.`, output: "Score + factor breakdown" },
      { step: 2, who: "AirIndex", action: "Runs a five-question ordinance audit: correct FAA terminology, vertiport as permitted use, FAA airspace determination in permit process, NFPA 418 in fire code, state enforcement posture.", output: "Audit: YES / PARTIAL / NO per question" },
      { step: 3, who: "AirIndex", action: "Produces a Market Intelligence Briefing: current score, ordinance audit results, gap roadmap with specific actions, score trajectory per action taken, peer market comparison, June 2026 AC alignment guidance.", output: "Market Intelligence Briefing PDF" },
      { step: 4, who: "City / DOT", action: "Reviews the briefing. Prioritizes actions by ease and impact. City council enacts zoning amendment. Score moves from 25 to 40 \u2014 crossing from NASCENT to EARLY tier.", output: "Score improvement + operator visibility" },
      { step: 5, who: "AirIndex", action: "Monitors score changes continuously. Alerts when a factor moves. Quarterly briefing update tracks progress against the roadmap.", output: "Ongoing readiness tracking" },
    ],
    specialSection: {
      title: "Real Example \u2014 Southeast Corridor Anchor City",
      body: "Starting at 25/NASCENT: No vertiport zoning \u2192 City Council enacts vertiport as permitted use \u2192 40/EARLY. FAA terminology not in city code \u2192 Replace \u2018helipad\u2019 with FAA-defined terms \u2192 +8 pts. All four ordinance gaps combined: four city-level actions, no state legislation required \u2192 52/MODERATE.",
    },
    engagements: [
      { product: "Market Intelligence Briefing", description: `Full seven-factor breakdown with primary source citations, ordinance audit, gap roadmap with ease \u00d7 impact prioritization, peer market comparison, 12-month score trajectory tied to specific actions.`, access: "Discovery call \u2014 then scoped" },
      { product: "Platform access", description: `Authenticated access to live scores, factor breakdowns, regulatory pipeline, score change alerts, and federal program gap analysis across all ${MARKET_COUNT} markets.`, access: "Included with briefing" },
      { product: "Ongoing monitoring", description: "Quarterly score update tied to actions taken. Alerts when legislation advances, operator announces market entry, or federal program changes affect eligibility.", access: "Annual renewal" },
    ],
    cta: `Contact sales@airindex.io to request a complimentary market snapshot for your city or state. Full methodology published at airindex.io/methodology.`,
  },

  "infrastructure": {
    segment: "infrastructure",
    number: "02",
    title: "Infrastructure Developer & A&E Firm",
    subtitle: "How developers and engineering firms use AirIndex to qualify markets, de-risk capital allocation, and align project timelines with regulatory readiness.",
    color: "#b45309",
    printColor: "#b45309",
    intro: "Infrastructure developers and A&E firms committing capital to vertiport projects need to know which markets are viable before engineering resources are deployed. AirIndex provides pre-feasibility market intelligence that separates markets ready for infrastructure investment from markets that look promising but aren\u2019t yet \u2014 and shows exactly what changes the calculation.",
    problem: "A major A&E firm is evaluating vertiport development opportunities across the Southeast. Three markets look promising based on population density and airport proximity. But one has no state AAM enabling legislation. Another has a favorable regulatory posture but no operator presence. The third has an operator announcement but the zoning framework doesn\u2019t permit vertiport construction. Without a structured readiness analysis, the firm can\u2019t determine which market justifies the next phase of engineering investment \u2014 and which will stall after site selection.",
    stats: [
      { value: String(MARKET_COUNT), label: "Markets scored", sublabel: "Daily updates from live pipeline" },
      { value: `${avgScore}/100`, label: "Avg national score", sublabel: "EARLY tier \u2014 most markets not ready yet" },
      { value: `${topScore}/100`, label: "Top market score", sublabel: "Dallas and LA lead the index" },
      { value: "5,647", label: "Heliport sites mapped", sublabel: "FAA-registered with lat/lng coordinates" },
    ],
    steps: [
      { step: 1, who: "AirIndex", action: `Scores target markets across 7 factors. Identifies which markets have the legislative framework, vertiport zoning, operator presence, and regulatory posture to support infrastructure investment \u2014 and which are blocked on one or two factors that could change in the near term.`, output: "Market readiness matrix" },
      { step: 2, who: "AirIndex", action: "Produces an Infrastructure Developer Briefing: VRT-first factor ordering, site conversion viability assessment (fewer than 20% of existing heliports can support eVTOL \u2014 most projects are greenfield), capital exposure by tier, favorable and stalled scenario projections.", output: "Infrastructure Developer Briefing PDF" },
      { step: 3, who: "AirIndex", action: "Heliport map shows all 5,647 FAA-registered sites with compliance status overlay (compliant / conditional / objectionable) \u2014 so site selection begins with verified data, not FAA 5010 records known to be inaccurate.", output: "Site-level compliance data" },
      { step: 4, who: "Firm", action: "Uses AirIndex market scores and gap analysis to rank markets by investment readiness. Allocates Phase 1 engineering to markets scoring 50+ with clear legislative momentum. Defers markets under 40 with no active legislation.", output: "Capital allocation decision" },
      { step: 5, who: "AirIndex", action: "Monitors score changes. When a stalled market passes enabling legislation or an operator announces a commitment, alerts the firm immediately.", output: "Market watch alerts" },
    ],
    specialSection: {
      title: "The Greenfield Imperative \u2014 Why Site Conversion Math Fails",
      body: "Fewer than 20% of the 5,647 FAA-registered heliports in the US can physically support eVTOL operations. TLOF and FATO dimension requirements for eVTOL are larger than helicopter standards. Most existing sites are encroached. Most hospital helipads were built to a 40x40 TLOF \u2014 eVTOL requires 50x50 minimum. Most cannot expand. The vertiport development conversation is almost entirely a greenfield conversation. AirIndex VRT factor scoring reflects this \u2014 we score regulatory framework, physical footprint availability, and operator interest, not conversion potential of existing helipads.",
    },
    engagements: [
      { product: "Pre-Feasibility Market Snapshot", description: "Complimentary one-page snapshot for a specific market. Score, tier, ordinance audit, and top three score-moving actions. Available before formal engagement.", access: "Complimentary" },
      { product: "Infrastructure Developer Briefing", description: "Full market analysis: VRT factor breakdown, site conversion viability, capital exposure by development phase, favorable and stalled scenario projections, 12-month regulatory trajectory.", access: "Discovery call \u2014 then scoped" },
      { product: "Multi-Market Intelligence Package", description: `Ongoing monitoring across a defined market set. Score alerts, regulatory pipeline updates, operator announcement tracking, corridor intelligence for multi-city infrastructure planning.`, access: "Annual subscription" },
    ],
    cta: `Contact sales@airindex.io to request a complimentary pre-feasibility snapshot for any of the ${MARKET_COUNT} tracked markets. Full methodology at airindex.io/methodology.`,
  },

  "aerospace-defense": {
    segment: "aerospace-defense",
    number: "03",
    title: "Aerospace & Defense",
    subtitle: "How defense and aerospace organizations use AirIndex to track AAM market formation, align product development with infrastructure readiness, and monitor federal program activity.",
    color: "#4338ca",
    printColor: "#4338ca",
    intro: "Aerospace and defense organizations tracking the AAM sector need structured intelligence on where the market is forming, where federal programs are concentrating, and where infrastructure investment is de-risked by regulatory frameworks. AirIndex provides the market readiness layer that connects operator deployment signals, legislative activity, federal program participation, and infrastructure status into a single continuously updated intelligence feed.",
    problem: "A systems engineering team at an aerospace and defense organization is tracking where AAM infrastructure is forming before making product positioning decisions. The questions they\u2019re asking: which US markets have the regulatory framework and operator activity to support near-term commercial operations? Which federal programs \u2014 eIPP, RAISE, SBIR \u2014 are concentrating investment in specific markets? Where should we be focused in the next 18 months before consensus forms? Trade press covers announcements. AirIndex covers the underlying signal.",
    stats: [
      { value: String(MARKET_COUNT), label: "Markets tracked", sublabel: "Daily signal ingestion" },
      { value: "1,900+", label: "Regulatory documents", sublabel: "Classified + sourced" },
      { value: "10", label: "Federal programs tracked", sublabel: "eIPP, RAISE, SBIR + more" },
      { value: "3", label: "Active US operators", sublabel: "Joby, Archer, Wisk (post-Blade acquisition)" },
    ],
    steps: [
      { step: 1, who: "AirIndex", action: `Continuously ingests regulatory filings, legislative records, operator announcements, and federal program activity across all ${MARKET_COUNT} markets. Classifies each signal against seven scoring factors. Updates scores daily.`, output: "Live market readiness scores" },
      { step: 2, who: "AirIndex", action: "Federal Program Intelligence Store (FPIS) tracks which markets are eligible for or participating in 10 active federal AAM programs. Shows where federal investment is flowing before it becomes public knowledge.", output: "Federal program alignment map" },
      { step: 3, who: "AirIndex", action: `Operator Intelligence Database tracks Joby, Archer, and Wisk across all tracked markets. Operator market entry is the single strongest leading indicator of near-term infrastructure demand.`, output: "Operator deployment tracker" },
      { step: 4, who: "Organization", action: "Uses AirIndex market scores and federal program data to identify the 5\u201310 markets where AAM infrastructure will concentrate in the next 18 months. Aligns product development, business development, and government affairs resources accordingly.", output: "18-month market positioning" },
      { step: 5, who: "AirIndex", action: "Score change alerts notify when a market crosses a tier threshold, when new legislation passes, or when a federal program selects a market. Intelligence arrives before it is priced into the market.", output: "Early signal alerts" },
    ],
    specialSection: {
      title: "The Intelligence Stack \u2014 What Makes This Defensible",
      body: `Market readiness scores: 7-factor composite score across ${MARKET_COUNT} US markets. Updated daily. Traceable to primary sources with methodology published.\n\nRegulatory pipeline: 1,900+ classified documents \u2014 federal filings, state legislation, FAA program activity, operator announcements. Self-updating daily pipeline.\n\nFederal program intelligence: 10 active programs tracked. Market-level eligibility and participation status.\n\nOperator deployment tracking: 3 active eVTOL operators tracked across all markets post-Joby/Blade consolidation. Market entry announcements, partnership activity, route planning signals.\n\nWeather infrastructure layer: WTH factor scoring tied to USDOT National Strategy Recommendation 2.8 \u2014 weather as one of four AAM infrastructure pillars. No market scores 100 under v1.3 \u2014 every market has a weather infrastructure gap.`,
    },
    engagements: [
      { product: "Enterprise Intelligence Subscription", description: `Authenticated platform access across all ${MARKET_COUNT} markets. Live scores, factor breakdowns, federal program alignment, operator tracking, score change alerts, and API access for embedding AirIndex data into internal workflows.`, access: "Discovery call \u2014 then scoped" },
      { product: "Custom market briefing", description: "Scoped intelligence package focused on a specific market set, corridor, or federal program intersection. Delivered as a structured report with primary source citations.", access: "Per engagement" },
    ],
    cta: "Contact sales@airindex.io to discuss an enterprise intelligence engagement. Full methodology and scoring model published at airindex.io/methodology.",
  },

  "insurance": {
    segment: "insurance",
    number: "04",
    title: "Insurance Carriers & Underwriters",
    subtitle: "How aviation liability carriers and underwriters use AirIndex to verify heliport compliance, screen portfolios, and build defensible underwriting baselines for AAM.",
    color: "#b45309",
    printColor: "#92400e",
    intro: "Aviation liability carriers are covering heliport assets they have never verified. They price risk based on self-reported operator documentation. Several carriers have exited the helicopter insurance market over the last 20 years because they couldn\u2019t manage unquantified exposure. AirIndex provides automated portfolio-level compliance pre-screening backed by FAA NASR data, OE/AAA airspace determinations, and NFPA 418 adoption tracking \u2014 giving underwriters ground truth for the first time. Physical site verification by credentialed inspectors is available as a premium add-on for flagged sites.",
    problem: `An aviation liability carrier has a book of business covering heliports across multiple states. Their underwriting process relies on self-reported documentation from facility owners. No standardized compliance verification exists. Of the thousands of FAA-registered heliports in the US, AirIndex has ingested over 26,000 FAA OE/AAA airspace determinations across 17 states \u2014 with no mechanism to verify whether the conditions in those determinations were ever implemented. The carrier doesn\u2019t know which sites in their portfolio are compliant, which are conditional, and which represent unquantified liability exposure. FAA Advisory Circulars are used as the \u2018standard of care\u2019 in civil lawsuits. Deviation equals negligence exposure.`,
    stats: [
      { value: "5,647", label: "Heliport sites in database", sublabel: "FAA NASR registered" },
      { value: "26,096", label: "FAA determinations ingested", sublabel: "OE/AAA NRA + CIRC (2024\u20132026)" },
      { value: "595", label: "Linked to heliports", sublabel: "Proximity-matched to registered sites" },
      { value: "3", label: "Compliance standards applied", sublabel: "FAA Part 5, ICAO, ISO 31000" },
    ],
    steps: [
      { step: 1, who: "AirIndex", action: "Opens the carrier relationship through content visibility, industry events, or direct outreach. AirIndex demonstrates the compliance gap problem: 5,647 registered heliports, 26,000+ FAA determinations with no verification mechanism, and NFPA 418 adoption gaps across jurisdictions.", output: "Introduction + framing" },
      { step: 2, who: "AirIndex", action: "Discovery call. Walks through the compliance gap problem using real data. Demonstrates portfolio-level screening capability: 5,647 registered sites, three-tier output: compliant / conditional / objectionable.", output: "Scope confirmed" },
      { step: 3, who: "AirIndex", action: "Portfolio intake. Carrier provides site list. AirIndex cross-references against FAA NASR records, airspace determination database (OE/AAA), state enforcement posture per market, NFPA 418 jurisdiction adoption, and eVTOL dimensional viability flag.", output: "Pre-screening of all sites" },
      { step: 4, who: "Credentialed Inspector", action: "Physical verification on highest-risk sites flagged in pre-screening. Full SMS risk analysis: TLOF/FATO dimensions, obstruction survey, approach path analysis, documentation review. Standards applied: Title 14 CFR Part 5, ICAO annex, ISO 31000.", output: "Site-level compliance determination" },
      { step: 5, who: "AirIndex", action: "Delivers Portfolio Compliance Screening Report: executive summary, site-by-site compliance matrix, liability exposure quantification by tier, renewal recommendations per asset, remediation roadmap for conditional sites.", output: "Portfolio Compliance Report" },
      { step: 6, who: "AirIndex", action: "Proposes annual monitoring subscription. Compliance status updates as regulations change, sites are remediated, and the June 2026 unified FAA Advisory Circular takes effect. Carrier has a continuously current compliance picture.", output: "Annual monitoring" },
    ],
    specialSection: {
      title: "Compliance Tiers \u2014 What the Output Looks Like",
      body: "COMPLIANT: Passes five-question compliance checklist from available public data and physical verification. No known compliance gaps. Underwriting implication: defensible coverage basis, standard renewal.\n\nCONDITIONAL: Fails one or more checklist questions but gaps are remediable. Physical verification completed. Specific remediation requirements identified. Underwriting implication: coverage conditional on remediation timeline.\n\nOBJECTIONABLE: Fails multiple checklist questions or has a critical gap. Physical verification confirms significant compliance deficit. Underwriting implication: unquantified liability exposure, coverage not recommended without remediation plan.",
    },
    engagements: [
      { product: "Portfolio Compliance Screening", description: "Full portfolio audit. AirIndex automated pre-screening across all sites + physical verification by credentialed inspectors on flagged sites. Deliverable: Portfolio Compliance Screening Report with site-by-site compliance matrix and remediation roadmap. Fee range: $75,000\u2013$150,000 depending on portfolio size.*", access: "Discovery call \u2014 then scoped" },
      { product: "Annual monitoring subscription", description: "Ongoing compliance status updates as regulations change, sites are remediated, and the June 2026 unified FAA Advisory Circular takes effect. Fee range: $25,000\u2013$50,000/year depending on portfolio size.*", access: "Included with full screening" },
    ],
    cta: "Contact sales@airindex.io to discuss portfolio compliance screening. Full methodology published at airindex.io/methodology.",
  },
};

export function getUseCaseBySegment(segment: string): UseCaseContent | undefined {
  return USE_CASE_DATA[segment];
}

export function getAllUseCaseSegments(): string[] {
  return Object.keys(USE_CASE_DATA);
}
