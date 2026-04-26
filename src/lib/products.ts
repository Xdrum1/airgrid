/**
 * AirIndex Product Catalog — single source of truth for all paid offerings.
 *
 * Drives:
 *   - /pricing (catalog view)
 *   - /briefings (filtered to briefing-format products)
 *   - /contact (intake routing — productId is stored on ContactInquiry)
 *   - /api/contact validation
 *
 * Updating this file: when adding a new product, set status to "coming_soon"
 * until the deliverable can actually be produced. Promote to "intake" when
 * we can hand-fulfill, and "live" only when there's a public sample route.
 */

export type ProductContainer =
  | "insurance"
  | "infra-developer"
  | "operator"
  | "municipality"
  | "investor"
  | "federal"
  | "cross-cutting";

export type ProductStatus =
  | "live"          // Public sample exists at sampleRoute; orderable today
  | "intake"        // Admin can fulfill; no public sample yet
  | "coming_soon";  // Not yet buildable — collect intent only

export type ProductFormat =
  | "pdf"
  | "briefing"      // Multi-page intelligence briefing (PDF + platform access)
  | "dashboard"     // Interactive subscription product
  | "api"
  | "subscription"  // Recurring email/alert delivery
  | "consulting";   // Custom engagement / SBIR

export interface Product {
  id: string;
  name: string;
  container: ProductContainer;
  containerLabel: string;
  status: ProductStatus;
  format: ProductFormat;
  /** Display string, e.g. "$7,500–$15,000" or "Custom" */
  price: string;
  /** Optional pricing context, e.g. "per facility", "annual", "/month" */
  priceNote?: string;
  /** Display string for delivery turnaround */
  turnaround?: string;
  /** 1-2 sentence card description */
  description: string;
  /** Single-line value prop for hero copy */
  pitch: string;
  /** What the buyer actually receives */
  deliverable: string;
  /** Who this is for */
  audience: string;
  /** Public sample URL — present for "live" products */
  sampleRoute?: string;
  /** CTA label for the catalog card */
  cta: string;
  /** Optional badge: "Priority", "New", "Most Popular" */
  badge?: string;
  /** Bullet list of what's included */
  features?: string[];
  /** Hex accent color */
  accent: string;
}

export const CONTAINER_LABELS: Record<ProductContainer, string> = {
  insurance: "Insurance",
  "infra-developer": "Infrastructure Developer",
  operator: "eVTOL Operator",
  municipality: "Municipality / State Agency",
  investor: "Investor",
  federal: "Federal / Government",
  "cross-cutting": "Platform & Data",
};

export const PRODUCTS: Product[] = [
  // ─────────────────────────────────────────────────────────
  // INSURANCE
  // ─────────────────────────────────────────────────────────
  {
    id: "risk-index-site",
    name: "RiskIndex Site Assessment",
    container: "insurance",
    containerLabel: CONTAINER_LABELS.insurance,
    status: "intake",
    format: "pdf",
    price: "$7,500–$15,000",
    priceNote: "3 or 5 facilities",
    turnaround: "24-hour turnaround",
    description:
      "Facility-level risk assessment combining DQS, OES, OEL, and NFPA 418 compliance. Litigation-defensible PDF for pre-underwriting and renewal pricing.",
    pitch: "Before you price the policy, know what you're actually insuring.",
    deliverable: "PDF report (8-12 pages) per facility — Mapbox satellite tile, dimensional compliance grid, hazard exposure score, primary-source citations.",
    audience: "Aviation underwriters, brokers, risk managers",
    sampleRoute: "/admin/reports/risk-assessment/sample",
    cta: "Request Assessment",
    accent: "#b45309",
    features: [
      "Dimensional compliance scoring (TLOF, FATO, approach surfaces)",
      "Rooftop airflow + HVAC exposure analysis",
      "NFPA 418 battery suppression gap flags",
      "Data Quality Score (DQS) + age-of-source flag",
      "Primary-source citations for every finding",
    ],
  },
  {
    id: "portfolio-screening",
    name: "Portfolio Screening Report",
    container: "insurance",
    containerLabel: CONTAINER_LABELS.insurance,
    status: "coming_soon",
    format: "pdf",
    price: "$15,000–$50,000",
    priceNote: "per portfolio",
    turnaround: "10 business days",
    description:
      "Bulk facility scoring for underwriters with large heliport books. Ranked CSV + executive PDF identifying high-risk facilities across the entire portfolio.",
    pitch: "Find the riskiest 5% of your book before they file a claim.",
    deliverable: "Ranked CSV (all facilities) + PDF executive summary with the top 20 high-risk sites flagged for renewal review.",
    audience: "Insurance carriers, brokers, MGAs",
    cta: "Request Quote",
    accent: "#b45309",
    features: [
      "Up to 500 facilities per engagement",
      "RiskIndex score per facility",
      "High-risk site flagging (renewal review queue)",
      "Mislabeled-facility detection",
      "Year-over-year score change tracking",
    ],
  },
  {
    id: "briefing-insurance",
    name: "Insurance Market Briefing",
    container: "insurance",
    containerLabel: CONTAINER_LABELS.insurance,
    status: "live",
    format: "briefing",
    price: "$10,000–$15,000",
    priceNote: "per market",
    turnaround: "10 business days",
    description:
      "Market-level exposure analysis. 5-question compliance audit, state regulatory posture, regulatory precedents, and peer-market benchmarks.",
    pitch: "Map your exposure by market before renewal.",
    deliverable: "12-18 page briefing PDF + 12-month platform access for the briefed market.",
    audience: "Aviation underwriters, broker risk teams",
    sampleRoute: "/reports/briefing-insurance/miami",
    cta: "Request Briefing",
    accent: "#b45309",
  },

  // ─────────────────────────────────────────────────────────
  // INFRASTRUCTURE DEVELOPER / A&E
  // ─────────────────────────────────────────────────────────
  {
    id: "market-readiness-briefing",
    name: "Market Readiness Briefing",
    container: "infra-developer",
    containerLabel: CONTAINER_LABELS["infra-developer"],
    status: "live",
    format: "briefing",
    price: "$10,000",
    priceNote: "single market",
    turnaround: "10 business days",
    description:
      "Pre-engineering market intelligence. Site viability, regulatory trajectory, capital exposure, and development roadmap for one tracked market.",
    pitch: "Know which markets are worth the engineering study before you commission it.",
    deliverable: "12-18 page briefing PDF + 12-month platform access for the briefed market.",
    audience: "Vertiport developers, A&E firms, REITs",
    sampleRoute: "/reports/briefing/miami",
    cta: "Request Briefing",
    badge: "Most Popular",
    accent: "#00d4ff",
  },
  {
    id: "state-audit",
    name: "State Readiness Audit",
    container: "infra-developer",
    containerLabel: CONTAINER_LABELS["infra-developer"],
    status: "live",
    format: "briefing",
    price: "$35,000",
    priceNote: "per state",
    turnaround: "3-4 weeks",
    description:
      "Statewide infrastructure audit. Every tracked heliport plus regulatory landscape, jurisdictional gaps, and prioritized investment roadmap.",
    pitch: "Statewide infrastructure intelligence in one deliverable.",
    deliverable: "25-35 page audit PDF + statewide CSV inventory + executive slide deck.",
    audience: "State DOTs, regional planning bodies, statewide developers",
    sampleRoute: "/reports/audit/fl",
    cta: "Request Audit",
    accent: "#00d4ff",
  },
  {
    id: "site-shortlist",
    name: "Site Shortlist Report",
    container: "infra-developer",
    containerLabel: CONTAINER_LABELS["infra-developer"],
    status: "intake",
    format: "pdf",
    price: "$5,000–$8,000",
    priceNote: "up to 10 sites",
    turnaround: "5 business days",
    description:
      "Submit up to 10 candidate addresses, receive a ranked viability matrix scored on DQS, OES, OEL, and regulatory posture per site.",
    pitch: "Rank candidate sites in days, not months.",
    deliverable: "Ranked PDF matrix + per-site one-page profiles with verdict, primary constraints, and primary triggers.",
    audience: "Vertiport developers, real estate investors, site-selection teams",
    cta: "Submit Sites",
    badge: "New",
    accent: "#00d4ff",
    features: [
      "Up to 10 candidate addresses",
      "Per-site viability verdict (GO / CAUTION / NO-GO)",
      "Ranked by composite readiness score",
      "Surfaces hidden regulatory constraints",
      "Mapbox satellite imagery per site",
    ],
  },

  // ─────────────────────────────────────────────────────────
  // EVTOL OPERATOR
  // ─────────────────────────────────────────────────────────
  {
    id: "operator-briefing",
    name: "Operator Market Briefing",
    container: "operator",
    containerLabel: CONTAINER_LABELS.operator,
    status: "live",
    format: "briefing",
    price: "$10,000–$15,000",
    priceNote: "per market",
    turnaround: "10 business days",
    description:
      "Deployment-decision intelligence. Operator landscape, infrastructure available for ops, regulatory friction, and entry-timing recommendation.",
    pitch: "Before you commit capital to a market, know its score.",
    deliverable: "12-18 page operator briefing PDF + 12-month platform access for the briefed market.",
    audience: "Joby, Archer, Wisk, Beta, Eve, regional operators",
    sampleRoute: "/reports/briefing-operator/los_angeles",
    cta: "Request Briefing",
    accent: "#7c3aed",
  },
  {
    id: "operator-dashboard",
    name: "Operator Deployment Dashboard",
    container: "operator",
    containerLabel: CONTAINER_LABELS.operator,
    status: "coming_soon",
    format: "dashboard",
    price: "$2,500–$5,000",
    priceNote: "/month",
    turnaround: "Live within 7 days",
    description:
      "Subscription dashboard tracking score movement across operator-selected markets with automated AIS Alerts on every score change.",
    pitch: "The Bloomberg terminal for your deployment markets.",
    deliverable: "Web dashboard + email/SMS alerts on score change, tier change, or legislative event.",
    audience: "Operator strategy + market analyst teams",
    cta: "Request Demo",
    accent: "#7c3aed",
    features: [
      "Up to 25 tracked markets",
      "Real-time score change alerts (5+ pt move, tier change, legislation)",
      "Comparative deployment readiness view",
      "Quarterly strategy review call",
      "API access included",
    ],
  },

  // ─────────────────────────────────────────────────────────
  // MUNICIPALITY / STATE AGENCY
  // ─────────────────────────────────────────────────────────
  {
    id: "municipal-briefing",
    name: "Municipal Intelligence Briefing",
    container: "municipality",
    containerLabel: CONTAINER_LABELS.municipality,
    status: "live",
    format: "briefing",
    price: "$10,000–$25,000",
    priceNote: "per city",
    turnaround: "10 business days",
    description:
      "Peer benchmark + gap roadmap for a tracked city. Designed for federal grant documentation, economic-development positioning, and council-level briefings.",
    pitch: "Know where your city stands before the operators decide for you.",
    deliverable: "12-18 page municipal briefing PDF + 12-month platform access + executive slide deck.",
    audience: "City planners, state DOTs, economic development",
    sampleRoute: "/reports/briefing-municipality/dallas",
    cta: "Request Briefing",
    accent: "#5B8DB8",
  },
  {
    id: "ahj-fire-marshal",
    name: "AHJ / Fire Marshal Briefing Kit",
    container: "municipality",
    containerLabel: CONTAINER_LABELS.municipality,
    status: "intake",
    format: "pdf",
    price: "$3,500–$5,000",
    priceNote: "per jurisdiction",
    turnaround: "5 business days",
    description:
      "Jurisdiction-level NFPA 418 gap report. Lists every facility in the AHJ that needs battery suppression, dimensional, or environmental upgrades before eVTOL operations begin.",
    pitch: "Know which facilities in your jurisdiction need upgrades before the operators arrive.",
    deliverable: "8-12 page AHJ briefing PDF + facility-level CSV + recommended inspection priority order.",
    audience: "Fire marshals, AHJs, city building departments",
    sampleRoute: "/reports/ahj/sample",
    cta: "Request Kit",
    badge: "Priority",
    accent: "#5B8DB8",
    features: [
      "Every facility in jurisdiction (FAA NASR + supplemental LZ datasets)",
      "NFPA 418 compliance gap flags",
      "Recommended inspection priority order",
      "Pre-arrival readiness checklist for eVTOL operators",
      "Methodology aligned with NFPA 418 and FAA AC 150/5390-2C",
    ],
  },

  // ─────────────────────────────────────────────────────────
  // INVESTOR
  // ─────────────────────────────────────────────────────────
  {
    id: "investor-briefing",
    name: "Investor Intelligence Brief",
    container: "investor",
    containerLabel: CONTAINER_LABELS.investor,
    status: "live",
    format: "briefing",
    price: "$15,000–$25,000",
    priceNote: "per market",
    turnaround: "10 business days",
    description:
      "Pre-investment market due diligence. Score trajectory, operator capital flow, federal program alignment, and regulatory catalyst analysis.",
    pitch: "Before you invest in the market, know its score.",
    deliverable: "18-24 page investor briefing PDF + 12-month platform access + analyst Q&A call.",
    audience: "Private equity, infrastructure funds, VC firms, corp dev",
    sampleRoute: "/reports/briefing-investor/miami",
    cta: "Request Briefing",
    accent: "#0369a1",
  },
  {
    id: "investment-grade",
    name: "Investment Grade Report",
    container: "investor",
    containerLabel: CONTAINER_LABELS.investor,
    status: "coming_soon",
    format: "pdf",
    price: "$15,000–$25,000",
    priceNote: "per report",
    turnaround: "15 business days",
    description:
      "Formal due-diligence document with full methodology citation, data-source provenance, and a signed AirIndex cover letter — designed to slot into investment memos.",
    pitch: "Investment-memo-ready market readiness, with our name on it.",
    deliverable: "Cover-letter signed PDF (~20 pages) with methodology appendix, data lineage, and 12-month score-update commitment.",
    audience: "Investment committees, IC memos, LP reporting",
    cta: "Request Report",
    accent: "#0369a1",
  },
  {
    id: "portfolio-monitoring",
    name: "Portfolio Monitoring License",
    container: "investor",
    containerLabel: CONTAINER_LABELS.investor,
    status: "coming_soon",
    format: "subscription",
    price: "$25,000–$50,000",
    priceNote: "annual",
    turnaround: "Live within 7 days",
    description:
      "Continuous readiness scores for every market where capital is deployed. Email digests, score-change alerts, quarterly portfolio review call.",
    pitch: "Score every market your portfolio touches, every day.",
    deliverable: "Web dashboard + monthly portfolio report PDF + quarterly review call + API access.",
    audience: "Infrastructure funds, LPs, sector analysts",
    cta: "Request Demo",
    accent: "#0369a1",
  },

  // ─────────────────────────────────────────────────────────
  // FEDERAL / GOVERNMENT
  // ─────────────────────────────────────────────────────────
  {
    id: "afwerx-sbir",
    name: "AFWERX / SBIR Engagement",
    container: "federal",
    containerLabel: CONTAINER_LABELS.federal,
    status: "intake",
    format: "consulting",
    price: "Phase I $68K → Phase II $300K–$750K",
    priceNote: "Phase III ongoing",
    turnaround: "Per SBIR timeline",
    description:
      "Military installation AAM readiness assessment, joint-use vertiport siting analysis, and low-altitude weather corridor mapping under SBIR/STTR pathways.",
    pitch: "The readiness intelligence layer the DOT National Strategy requires.",
    deliverable: "SBIR-formatted Phase I report → Phase II prototype → Phase III sole-source contract pathway.",
    audience: "AFWERX, DAF, AFRL, AFIMSC, installation commanders",
    cta: "Discuss Engagement",
    accent: "#475569",
  },

  // ─────────────────────────────────────────────────────────
  // CROSS-CUTTING (PLATFORM & DATA)
  // ─────────────────────────────────────────────────────────
  {
    id: "ais-alerts",
    name: "AIS Alert Subscription",
    container: "cross-cutting",
    containerLabel: CONTAINER_LABELS["cross-cutting"],
    status: "intake",
    format: "subscription",
    price: "$500–$1,000",
    priceNote: "/month",
    turnaround: "Live same day",
    description:
      "Real-time email alerts on every 5+ point score move, tier change, or legislative event across selected markets.",
    pitch: "Score changes in your inbox, the day they happen.",
    deliverable: "Email alerts (real-time) + weekly digest + dashboard alert history.",
    audience: "All buyer types — operators, developers, investors, municipalities",
    cta: "Subscribe",
    accent: "#0d9488",
  },
  {
    id: "api-access",
    name: "API Access",
    container: "cross-cutting",
    containerLabel: CONTAINER_LABELS["cross-cutting"],
    status: "live",
    format: "api",
    price: "Custom",
    priceNote: "rate-tier based",
    turnaround: "Keys issued same day",
    description:
      "RESTful access to market scores, history, factor breakdowns, and bulk export. Bearer-token auth with rate-limited tiers.",
    pitch: "Embed AirIndex into your own analytics stack.",
    deliverable: "API key + documentation + rate-limit tier + status-page subscription.",
    audience: "Data engineering teams, internal market intelligence groups",
    sampleRoute: "/api",
    cta: "Request Keys",
    accent: "#0d9488",
  },
  {
    id: "snapshot-pdf",
    name: "Market Snapshot",
    container: "cross-cutting",
    containerLabel: CONTAINER_LABELS["cross-cutting"],
    status: "live",
    format: "pdf",
    price: "Free",
    turnaround: "Instant",
    description:
      "Single-page shareable score card for any tracked market — current score, tier, top movers, and primary constraints.",
    pitch: "Send a market score in one link.",
    deliverable: "1-page printable HTML/PDF snapshot card.",
    audience: "Anyone — press, LinkedIn, internal-share",
    sampleRoute: "/reports/snapshot/miami",
    cta: "View Sample",
    accent: "#5B8DB8",
  },
];

// ─────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductsByContainer(container: ProductContainer): Product[] {
  return PRODUCTS.filter((p) => p.container === container);
}

export function getProductsByStatus(status: ProductStatus): Product[] {
  return PRODUCTS.filter((p) => p.status === status);
}

export function getOrderableProducts(): Product[] {
  return PRODUCTS.filter((p) => p.status !== "coming_soon");
}

export function isValidProductId(id: string): boolean {
  return PRODUCTS.some((p) => p.id === id);
}

export const CONTAINER_ORDER: ProductContainer[] = [
  "infra-developer",
  "operator",
  "insurance",
  "municipality",
  "investor",
  "federal",
  "cross-cutting",
];

export const STATUS_LABELS: Record<ProductStatus, string> = {
  live: "Available",
  intake: "By request",
  coming_soon: "Coming soon",
};
