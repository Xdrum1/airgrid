/**
 * Container Manifest — canonical source of truth for VDG's product line.
 *
 * Every buyer-facing product is a "container" that reads from the shared
 * data layer and renders a persona-specific output. This file declares
 * each container, its routes, its data dependencies, its buyer, and its
 * pricing — so the container architecture is real in code, not just in
 * Notion.
 *
 * Reference: Notion "VDG Container Architecture — Buyer-Specific
 * Intelligence Model" (canonical as of Apr 15 2026).
 *
 * Principle: never sell the platform, sell the container.
 */

export type ContainerStatus = "live" | "live-admin-gated" | "proposed";

export type ContainerId =
  | "operator"
  | "infrastructure"
  | "municipality"
  | "insurance"
  | "investor"
  | "risk-site"
  | "federal";

export interface Container {
  id: ContainerId;
  name: string;
  status: ContainerStatus;

  /** Who buys this container — the persona we pitch to. */
  buyer: string;

  /** Routes composing this container's deliverable surface. */
  routes: string[];

  /** Named src/lib/* modules this container relies on for its output. */
  libs: string[];

  /** Prisma / DB tables whose data flows into this container. */
  dataTables: string[];

  /** Pricing range (annual license unless noted). */
  pricing: string;

  /** Named warm contacts in this persona (empty if cold). */
  warmContacts: string[];

  /** One-line pitch blurb for email / outreach. */
  pitch: string;
}

export const CONTAINERS: Record<ContainerId, Container> = {
  operator: {
    id: "operator",
    name: "Operator Intelligence",
    status: "live",
    buyer: "eVTOL operators (Joby, Archer, Wisk, Eve)",
    routes: ["/reports/briefing-operator/[cityId]"],
    libs: ["scoring", "mcs", "operator-intelligence", "forward-signals", "rpl-precedents"],
    dataTables: ["City (FKB)", "OperatorIntelligence (OID)", "McsStateContext"],
    pricing: "$5K–$15K/market",
    warmContacts: [
      // Don Berchoff's 5 eIPP team introductions are the canonical warm path here
    ],
    pitch:
      "Market-by-market readiness intelligence for eVTOL route planning and deployment sequencing. Regulatory posture, vertiport pipeline, competitor presence, forward signals.",
  },

  infrastructure: {
    id: "infrastructure",
    name: "Infrastructure Developer",
    status: "live",
    buyer: "Developers, REITs, A&E firms, site selection teams",
    routes: ["/reports/briefing/[cityId]", "/reports/gap/[cityId]"],
    libs: ["scoring", "mcs", "gap-analysis", "rpl-precedents", "forward-signals"],
    dataTables: ["City (FKB)", "McsStateContext", "RegulatoryPrecedent", "Heliport"],
    pricing: "$5K–$25K/yr",
    warmContacts: ["Ted Osborne (PS&S)"],
    pitch:
      "Market selection and gap-to-readiness intelligence for infrastructure developers. Jurisdiction posture, zoning + permitting landscape, peer-market benchmarks, precedent registry.",
  },

  municipality: {
    id: "municipality",
    name: "Municipality",
    status: "live",
    buyer: "City planners, state agencies, economic development offices",
    routes: ["/reports/briefing-municipality/[cityId]"],
    libs: ["scoring", "mcs", "fpis", "forward-signals"],
    dataTables: ["City (FKB)", "McsStateContext", "FederalProgram (FPIS)"],
    pricing: "$10K–$30K/yr",
    warmContacts: [],
    pitch:
      "Municipal readiness posture vs. peer cities. Legislative + federal-program landscape, economic development positioning, benchmarking against same-state and same-tier peers.",
  },

  insurance: {
    id: "insurance",
    name: "Insurance — City & Portfolio",
    status: "live",
    buyer: "Aviation liability carriers, brokers, reinsurers",
    routes: ["/reports/briefing-insurance/[cityId]"],
    libs: ["scoring", "mcs", "rpl-precedents", "forward-signals"],
    dataTables: ["City (FKB)", "McsStateContext", "Heliport", "HeliportCompliance"],
    pricing: "$15K–$25K/yr per market",
    warmContacts: ["Larry Mattiello (The Loomis Company)"],
    pitch:
      "City-level aviation liability intelligence. Heliport compliance audit, state regulatory posture, precedent-driven exposure framing, portfolio peer comparison.",
  },

  investor: {
    id: "investor",
    name: "Investor",
    status: "live",
    buyer: "Institutional investors, sector analysts, LPs",
    routes: ["/reports/briefing-investor/[cityId]"],
    libs: ["scoring", "mcs", "operator-intelligence", "forward-signals"],
    dataTables: ["City (FKB)", "McsStateContext", "OperatorIntelligence (OID)"],
    pricing: "$10K–$25K/yr",
    warmContacts: [],
    pitch:
      "Market-by-market readiness and operator-deployment intelligence for AAM / eVTOL sector analysts. Forward signals drive thesis timing; operator graph drives competitive landscape.",
  },

  "risk-site": {
    id: "risk-site",
    name: "RiskIndex Site Assessment",
    status: "live-admin-gated",
    buyer: "Brokers, underwriters, infrastructure owners",
    routes: ["/admin/reports/risk-assessment/[siteId]"],
    libs: ["risk-index", "mcs", "satellite-tile"],
    dataTables: [
      "Heliport",
      "HeliportCompliance",
      "OeaaaDetermination",
      "McsStateContext",
    ],
    pricing: "$2.5K–$10K per site · $50K–$150K/yr portfolio",
    warmContacts: ["Larry Mattiello (The Loomis Company)"],
    pitch:
      "Single-facility risk assessment composing FAA registry, 5-question compliance framework, airspace determinations, and state regulatory burden into an underwriter-ready file with satellite visualization.",
  },

  federal: {
    id: "federal",
    name: "Federal / Government",
    status: "proposed",
    buyer: "DOT, AFWERX, FAA eIPP teams, state aviation offices",
    routes: [],
    libs: ["scoring", "mcs", "fpis", "rpl-precedents", "forward-signals"],
    dataTables: [
      "City (FKB)",
      "McsStateContext",
      "FederalProgram (FPIS)",
      "RegulatoryPrecedent",
    ],
    pricing: "$25K–$150K contract or grant-funded",
    warmContacts: [
      // Don's 5 eIPP team intros bridge operator + federal containers
    ],
    pitch:
      "Policy effectiveness and infrastructure-investment prioritization intelligence for federal aviation offices. Program targeting, regulatory-precedent tracking, cross-state readiness comparison.",
  },
};

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

export function listContainers(): Container[] {
  return Object.values(CONTAINERS);
}

export function liveContainers(): Container[] {
  return listContainers().filter((c) => c.status !== "proposed");
}

export function getContainer(id: ContainerId): Container {
  return CONTAINERS[id];
}
