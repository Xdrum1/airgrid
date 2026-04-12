/**
 * Pre-Development Facility Tracker
 *
 * Tracks vertiport/heliport facilities that are announced, under development,
 * or in permitting — but NOT yet registered in the FAA NASR 5010 database.
 *
 * These facilities are invisible to standard compliance screening. The tracker
 * fills the gap between "announced" and "FAA-registered" so the platform can:
 *   1. Show them in gap analysis and market profiles
 *   2. Run audit assessments against them (like the Watson Island case study)
 *   3. Monitor them for status changes (occupancy permits, FAA registration)
 *   4. Alert subscribers when a facility enters the FAA system
 *
 * When a facility receives an FAA LID and appears in NASR, it should be
 * removed from this file and will be picked up by the standard heliport
 * ingestion pipeline (scripts/ingest-heliports.ts).
 */

export type FacilityStatus =
  | "announced"        // Press release or public commitment, no permits filed
  | "permitting"       // Permits filed or in process
  | "under_construction" // Active construction
  | "occupancy_pending"  // Built, awaiting final permits
  | "operational_no_faa" // Operating without FAA registration (rare but exists)
  | "faa_registered";    // Graduated — remove from this file

export type FacilityType =
  | "vertiport"
  | "heliport"
  | "aam_hub"
  | "landing_zone"
  | "mro_facility";

export interface PreDevelopmentFacility {
  id: string;
  name: string;
  type: FacilityType;
  status: FacilityStatus;

  // Location
  city: string;
  state: string;
  address?: string;
  lat: number;
  lng: number;
  /** Nearest AirIndex tracked market */
  marketId?: string;

  // Ownership & development
  developer: string;
  operator?: string;
  /** e.g. "Skyports Infrastructure" */
  infrastructurePartner?: string;
  /** e.g. "Archer Aviation" */
  operatorPartner?: string;

  // Physical specs
  parcelSizeSqFt?: number;
  parcelSizeAcres?: number;
  siteType: "ground" | "rooftop" | "airport_adjacent" | "existing_helipad_conversion";
  estimatedPadCount?: number;
  evtolCapable: boolean;

  // Regulatory
  faaLid?: string;
  zoningApproved: boolean;
  zoningNote?: string;
  leaseStructure?: string;
  adjacentFaaFacility?: string;

  // Timeline
  announcedDate?: string;
  permitFiledDate?: string;
  constructionStartDate?: string;
  expectedOperationalDate?: string;

  // Audit
  /** Result of running 5-question audit */
  auditStatus?: "compliant" | "conditional" | "objectionable" | "not_assessed";
  auditUrl?: string;

  // Sources
  primarySource: string;
  primarySourceUrl?: string;
  additionalSources?: { label: string; url?: string }[];

  notes?: string;
  lastUpdated: string;
}

// ====================================================================
// FACILITIES
// ====================================================================

export const PRE_DEVELOPMENT_FACILITIES: PreDevelopmentFacility[] = [
  // ── Miami Metro ──
  {
    id: "pf_watson_island",
    name: "Watson Island Heliport",
    type: "aam_hub",
    status: "occupancy_pending",
    city: "Miami",
    state: "FL",
    address: "980 MacArthur Causeway, Miami, FL 33132",
    lat: 25.7783,
    lng: -80.1702,
    marketId: "miami",
    developer: "Linden Airport Services Corp. d/b/a Watson Island Heliport Corporation",
    infrastructurePartner: "Skyports Infrastructure",
    parcelSizeSqFt: 55807,
    parcelSizeAcres: 1.28,
    siteType: "ground",
    estimatedPadCount: 2,
    evtolCapable: true,
    zoningApproved: true,
    zoningNote: "Rezoned from 'Public Parks and Recreation' to 'Major Institutional, Public Facilities, Transportation and Utilities' (2016)",
    leaseStructure: "30-year lease between Miami Sports & Exhibition Authority and Linden Airport Services (approved June 2016)",
    adjacentFaaFacility: "X44 (Miami Seaplane Base)",
    announcedDate: "2016-06",
    expectedOperationalDate: "2026",
    auditStatus: "objectionable",
    auditUrl: "/reports/audit/facility/watson-island",
    primarySource: "Miami City Commission records; Skyports Infrastructure press release (Jan 2026)",
    primarySourceUrl: "https://miamiheliport.com",
    notes: "Most strategically important AAM site in Miami. Skyports MOU (Jan 2026) positions as next-gen helicopter + eVTOL hub. Not in FAA NASR — occupancy permits still in process. Adjacent to X44 seaplane base (Blade/Joby ops).",
    lastUpdated: "2026-04-12",
  },
  {
    id: "pf_magic_city",
    name: "Magic City Innovation District Vertiport",
    type: "vertiport",
    status: "announced",
    city: "Miami",
    state: "FL",
    lat: 25.8200,
    lng: -80.1950,
    marketId: "miami",
    developer: "Dragon Global / Magic City Innovation District",
    operatorPartner: "Archer Aviation",
    siteType: "ground",
    evtolCapable: true,
    zoningApproved: false,
    announcedDate: "2025-12",
    primarySource: "Archer Aviation investor relations (Dec 3, 2025)",
    primarySourceUrl: "https://www.investors.archer.com/news/news-details/2025/Archer-Reveals-Plans-for-Miami-Air-Taxi-Network-Featuring-Partnerships-With-Related-Ross-and-Magic-City-Innovation-District/default.aspx",
    notes: "Part of Archer's Miami air taxi network. Little Haiti neighborhood. Development details TBD.",
    lastUpdated: "2026-04-12",
  },
  {
    id: "pf_related_ross_wpb",
    name: "Related Ross Downtown West Palm Beach Vertiport",
    type: "vertiport",
    status: "announced",
    city: "West Palm Beach",
    state: "FL",
    lat: 26.7153,
    lng: -80.0534,
    marketId: "miami",
    developer: "Related Ross",
    operatorPartner: "Archer Aviation",
    siteType: "ground",
    evtolCapable: true,
    zoningApproved: false,
    announcedDate: "2025-12",
    primarySource: "Archer Aviation investor relations (Dec 3, 2025)",
    primarySourceUrl: "https://www.investors.archer.com/news/news-details/2025/Archer-Reveals-Plans-for-Miami-Air-Taxi-Network-Featuring-Partnerships-With-Related-Ross-and-Magic-City-Innovation-District/default.aspx",
    notes: "Within Related Ross downtown development. Part of Archer's Miami-to-West Palm Beach network.",
    lastUpdated: "2026-04-12",
  },
  {
    id: "pf_hard_rock",
    name: "Hard Rock Stadium Landing Zone",
    type: "landing_zone",
    status: "announced",
    city: "Miami Gardens",
    state: "FL",
    lat: 25.9580,
    lng: -80.2389,
    marketId: "miami",
    developer: "Hard Rock Stadium / South Florida Racing Associates",
    operatorPartner: "Archer Aviation",
    siteType: "existing_helipad_conversion",
    evtolCapable: true,
    zoningApproved: false,
    zoningNote: "Existing helipad at stadium — conversion for eVTOL use announced but zoning pathway not confirmed",
    announcedDate: "2025-12",
    primarySource: "Archer Aviation investor relations (Dec 3, 2025)",
    notes: "Existing helipad converted for eVTOL. Event-driven demand (NFL, F1 Grand Prix, concerts).",
    lastUpdated: "2026-04-12",
  },
  {
    id: "pf_apogee_golf",
    name: "Apogee Golf Club Landing Zone",
    type: "landing_zone",
    status: "announced",
    city: "Hobe Sound",
    state: "FL",
    lat: 27.0756,
    lng: -80.1365,
    marketId: "miami",
    developer: "Apogee Golf Club",
    operatorPartner: "Archer Aviation",
    siteType: "existing_helipad_conversion",
    evtolCapable: true,
    zoningApproved: false,
    announcedDate: "2025-12",
    primarySource: "Archer Aviation investor relations (Dec 3, 2025)",
    notes: "Existing helipad converted for eVTOL. High-net-worth residential community.",
    lastUpdated: "2026-04-12",
  },

  // ── Central Florida (I-4 Corridor) ──
  {
    id: "pf_suntrax",
    name: "SunTrax Air — Florida AAM Headquarters",
    type: "aam_hub",
    status: "under_construction",
    city: "Auburndale",
    state: "FL",
    lat: 28.1567,
    lng: -81.7200,
    marketId: "orlando",
    developer: "FDOT",
    parcelSizeAcres: 400, // SunTrax campus total
    siteType: "ground",
    estimatedPadCount: 6,
    evtolCapable: true,
    zoningApproved: true,
    zoningNote: "State-owned transportation testing facility",
    constructionStartDate: "2025-09",
    expectedOperationalDate: "2026-12",
    primarySource: "FDOT AAM Business Plan (Nov 2025)",
    primarySourceUrl: "https://suntraxfl.com/suntrax-air/",
    notes: "Phase 1A (1 vertiport) complete Oct 2025. Phase 1B (Jan-Feb 2026) adds charging, maintenance hangar. Full buildout: 6 vertiports, 3,000 ft landing strip, R&D building with rooftop vertiport. Anchor for I-4 corridor AAM deployment.",
    lastUpdated: "2026-04-12",
  },
];

// ── Helpers ──

export function getPreDevFacilitiesForMarket(marketId: string): PreDevelopmentFacility[] {
  return PRE_DEVELOPMENT_FACILITIES.filter((f) => f.marketId === marketId);
}

export function getPreDevFacilitiesByStatus(status: FacilityStatus): PreDevelopmentFacility[] {
  return PRE_DEVELOPMENT_FACILITIES.filter((f) => f.status === status);
}

export function getPreDevFacilitiesByState(state: string): PreDevelopmentFacility[] {
  return PRE_DEVELOPMENT_FACILITIES.filter((f) => f.state === state.toUpperCase());
}

/** Count of facilities by status for a given market */
export function getPreDevSummaryForMarket(marketId: string): Record<FacilityStatus, number> {
  const facilities = getPreDevFacilitiesForMarket(marketId);
  const summary: Record<string, number> = {
    announced: 0,
    permitting: 0,
    under_construction: 0,
    occupancy_pending: 0,
    operational_no_faa: 0,
    faa_registered: 0,
  };
  for (const f of facilities) {
    summary[f.status] = (summary[f.status] ?? 0) + 1;
  }
  return summary as Record<FacilityStatus, number>;
}
