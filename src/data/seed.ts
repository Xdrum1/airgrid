import { Operator, City, Vertiport, Corridor, SubIndicator } from "@/types";
import { calculateReadinessScore, calculateReadinessScoreFromFkb } from "@/lib/scoring";

// ============================================================
// OPERATORS
// ============================================================
export const OPERATORS: Operator[] = [
  {
    id: "op_joby",
    name: "Joby Aviation",
    type: "evtol_manufacturer",
    hq: "Santa Cruz, CA",
    faaCertStatus: "in_progress",
    aircraft: ["Joby S4"],
    funding: "$2.3B",
    keyPartnerships: ["Uber", "Delta Airlines", "Toyota", "Dubai RTA"],
    activeMarkets: ["los_angeles", "new_york", "miami"],
    acquisitions: ["Blade Air Mobility (acquired Aug 2025, ~$125M — NYC/LA/Miami terminal network)"],
    color: "#5B8DB8",
    website: "https://www.jobyaviation.com",
    lastUpdated: "2026-03-03",
  },
  {
    id: "op_archer",
    name: "Archer Aviation",
    type: "evtol_manufacturer",
    hq: "San Jose, CA",
    faaCertStatus: "in_progress",
    aircraft: ["Midnight"],
    funding: "$1.1B",
    keyPartnerships: ["United Airlines", "Southwest Airlines", "Abu Dhabi Aviation", "NVIDIA", "Starlink"],
    activeMarkets: ["los_angeles", "new_york", "chicago", "miami"],
    color: "#ff6b35",
    website: "https://www.archer.com",
    lastUpdated: "2026-03-03",
  },
  {
    id: "op_wisk",
    name: "Wisk Aero",
    type: "evtol_manufacturer",
    hq: "Mountain View, CA",
    faaCertStatus: "in_progress",
    aircraft: ["Cora", "Gen 6"],
    funding: "Boeing (sole owner)",
    keyPartnerships: ["Boeing", "Air New Zealand", "U.S. eIPP Program"],
    activeMarkets: ["dallas"],
    color: "#7c3aed",
    website: "https://wisk.aero",
    lastUpdated: "2026-03-03",
  },
  {
    id: "op_blade",
    name: "Blade Air Mobility (Joby subsidiary)",
    type: "air_taxi_service",
    hq: "New York, NY",
    faaCertStatus: "operational",
    aircraft: ["Various helicopters"],
    funding: "Acquired by Joby Aviation (Aug 2025, ~$125M)",
    keyPartnerships: ["Joby Aviation (parent company)"],
    activeMarkets: [], // operations folded into Joby
    status: "acquired",
    color: "#10b981",
    website: "https://www.blade.com",
    lastUpdated: "2026-03-17",
  },
  {
    id: "op_volocopter",
    name: "Volocopter",
    type: "evtol_manufacturer",
    hq: "Bruchsal, Germany",
    faaCertStatus: "pending",
    aircraft: ["VoloCity", "VoloXPro"],
    funding: "Wanfeng Group / Diamond Aircraft (acquired Mar 2025, post-insolvency)",
    keyPartnerships: ["Diamond Aircraft", "ADAC Luftrettung"],
    activeMarkets: [],
    color: "#f59e0b",
    website: "https://www.volocopter.com",
    lastUpdated: "2026-03-03",
  },
];

export const OPERATORS_MAP: Record<string, Operator> = Object.fromEntries(
  OPERATORS.map((op) => [op.id, op])
);

// ============================================================
// VERTIPORTS
// ============================================================
export const VERTIPORTS: Vertiport[] = [
  // Los Angeles (3)
  {
    id: "vp_lax_adjacent",
    name: "LAX Adjacent Vertiport",
    operatorId: "op_joby",
    status: "permitted",
    cityId: "los_angeles",
    lat: 33.9425,
    lng: -118.408,
    siteType: "airport_adjacent",
    padCount: 4,
    chargingCapable: true,
    permitFilingDate: "2024-08-15",
    expectedOpenDate: "2026-06-01",
    sourceUrl: "https://www.jobyaviation.com",
    lastUpdated: "2025-02-01",
  },
  {
    id: "vp_santa_monica",
    name: "Archer Santa Monica",
    operatorId: "op_archer",
    status: "planned",
    cityId: "los_angeles",
    lat: 34.0195,
    lng: -118.4912,
    siteType: "rooftop",
    padCount: 2,
    chargingCapable: true,
    expectedOpenDate: "2027-01-01",
    sourceUrl: "https://www.archer.com",
    lastUpdated: "2025-02-01",
  },
  {
    id: "vp_dtla",
    name: "Joby DTLA",
    operatorId: "op_joby",
    status: "planned",
    cityId: "los_angeles",
    lat: 34.0407,
    lng: -118.2468,
    siteType: "rooftop",
    padCount: 3,
    chargingCapable: true,
    expectedOpenDate: "2027-06-01",
    lastUpdated: "2025-02-01",
  },
  // Dallas (2)
  {
    id: "vp_dfw_texas",
    name: "DFW Vertiport Texas",
    status: "under_construction",
    cityId: "dallas",
    lat: 32.8998,
    lng: -97.0403,
    siteType: "airport_adjacent",
    padCount: 6,
    chargingCapable: true,
    permitFilingDate: "2024-03-10",
    expectedOpenDate: "2026-03-01",
    lastUpdated: "2025-02-01",
  },
  {
    id: "vp_wisk_corridor",
    name: "Wisk Corridor Pad",
    operatorId: "op_wisk",
    status: "operational",
    cityId: "dallas",
    lat: 32.7767,
    lng: -96.797,
    siteType: "ground",
    padCount: 2,
    chargingCapable: true,
    lastUpdated: "2025-02-01",
  },
  // New York (1)
  {
    id: "vp_blade_manhattan",
    name: "Manhattan Heliport (ex-Blade)",
    operatorId: "op_joby",
    status: "operational",
    cityId: "new_york",
    lat: 40.7012,
    lng: -74.009,
    siteType: "ground",
    padCount: 3,
    chargingCapable: false,
    sourceUrl: "https://www.blade.com",
    lastUpdated: "2026-03-03",
  },
  // Orlando (1)
  {
    id: "vp_lake_nona",
    name: "Lake Nona Vertiport",
    status: "permitted",
    cityId: "orlando",
    lat: 28.3747,
    lng: -81.2186,
    siteType: "ground",
    padCount: 2,
    chargingCapable: true,
    permitFilingDate: "2024-11-01",
    expectedOpenDate: "2026-09-01",
    lastUpdated: "2025-02-01",
  },
  // Miami (2)
  {
    id: "vp_watson_island",
    name: "Watson Island Heliport (Skyports/Linden)",
    status: "under_construction",
    cityId: "miami",
    lat: 25.7783,
    lng: -80.1702,
    siteType: "ground",
    padCount: 2,
    chargingCapable: false,
    notes: "30-year city lease to Linden Airport Services (approved 2016). 55,807 sq ft on city-owned Watson Island. Skyports Infrastructure MOU signed Jan 2026 to develop as next-gen AAM hub. Adjacent to X44 seaplane base. Occupancy permits in process — not yet FAA-registered.",
    sourceUrl: "https://miamiheliport.com",
    lastUpdated: "2026-04-12",
  },
  {
    id: "vp_blade_opa_locka",
    name: "Blade Lounge at Opa-Locka Executive (OPF)",
    operatorId: "op_joby",
    status: "operational",
    cityId: "miami",
    lat: 25.9070,
    lng: -80.2784,
    siteType: "airport_adjacent",
    padCount: 1,
    chargingCapable: false,
    notes: "Blade (now Joby subsidiary) operates helicopter/jet charter departures from dedicated lounge at 4340 NW 145th St, Opa-locka. Routes to Palm Beach, Fort Lauderdale, Miami Beach. Primary Miami departure point for rotorcraft operations.",
    sourceUrl: "https://www.blade.com",
    lastUpdated: "2026-04-12",
  },
  // Las Vegas (1)
  {
    id: "vp_lvcc_rooftop",
    name: "LVCC Rooftop Vertiport",
    status: "planned",
    cityId: "las_vegas",
    lat: 36.1311,
    lng: -115.1526,
    siteType: "rooftop",
    padCount: 2,
    chargingCapable: true,
    expectedOpenDate: "2027-06-01",
    lastUpdated: "2025-02-01",
  },
];

export const VERTIPORTS_MAP: Record<string, Vertiport> = Object.fromEntries(
  VERTIPORTS.map((v) => [v.id, v])
);

export function getVertiportsForCity(cityId: string): Vertiport[] {
  return VERTIPORTS.filter((v) => v.cityId === cityId);
}

// ============================================================
// CORRIDORS
// ============================================================
export const CORRIDORS: Corridor[] = [
  {
    id: "cor_lax_dtla",
    name: "LAX – DTLA",
    status: "proposed",
    cityId: "los_angeles",
    operatorId: "op_joby",
    startPoint: { lat: 33.9425, lng: -118.408, label: "LAX Adjacent" },
    endPoint: { lat: 34.0407, lng: -118.2468, label: "DTLA" },
    distanceKm: 22,
    estimatedFlightMinutes: 12,
    maxAltitudeFt: 1500,
    notes: "Primary Joby launch corridor connecting LAX to downtown LA.",
    lastUpdated: "2025-02-01",
  },
  {
    id: "cor_lax_santamonica",
    name: "LAX – Santa Monica",
    status: "proposed",
    cityId: "los_angeles",
    operatorId: "op_archer",
    startPoint: { lat: 33.9425, lng: -118.408, label: "LAX Adjacent" },
    endPoint: { lat: 34.0195, lng: -118.4912, label: "Santa Monica" },
    distanceKm: 10,
    estimatedFlightMinutes: 6,
    maxAltitudeFt: 1000,
    notes: "Short coastal corridor for Archer Midnight operations.",
    lastUpdated: "2025-02-01",
  },
  {
    id: "cor_dfw_downtown",
    name: "DFW – Downtown Dallas",
    status: "authorized",
    cityId: "dallas",
    operatorId: "op_wisk",
    startPoint: { lat: 32.8998, lng: -97.0403, label: "DFW Vertiport" },
    endPoint: { lat: 32.7767, lng: -96.797, label: "Downtown Dallas" },
    distanceKm: 18,
    estimatedFlightMinutes: 10,
    maxAltitudeFt: 1500,
    altitudeMinFt: 500,
    faaAuthNumber: "FAA-UAM-2025-0042",
    effectiveDate: "2025-06-15",
    expirationDate: "2027-06-15",
    clearedOperators: ["op_wisk"],
    notes: "First authorized UAM corridor in Texas under HB 1735.",
    lastUpdated: "2025-02-01",
  },
  {
    id: "cor_jfk_manhattan",
    name: "JFK – Manhattan",
    status: "proposed",
    cityId: "new_york",
    operatorId: "op_joby",
    startPoint: { lat: 40.6413, lng: -73.7781, label: "JFK Airport" },
    endPoint: { lat: 40.7012, lng: -74.009, label: "Manhattan Heliport" },
    waypoints: [{ lat: 40.6101, lng: -73.8448 }],
    distanceKm: 24,
    estimatedFlightMinutes: 14,
    maxAltitudeFt: 2000,
    notes: "Routing via Jamaica Bay to minimize overflown population. Joby inherited this corridor via Blade acquisition (Aug 2025).",
    lastUpdated: "2026-03-17",
  },
  {
    id: "cor_mco_lakenona",
    name: "MCO – Lake Nona",
    status: "proposed",
    cityId: "orlando",
    startPoint: { lat: 28.4312, lng: -81.308, label: "MCO Airport" },
    endPoint: { lat: 28.3747, lng: -81.2186, label: "Lake Nona" },
    distanceKm: 8,
    estimatedFlightMinutes: 5,
    maxAltitudeFt: 800,
    notes: "Short connector from Orlando airport to smart city district.",
    lastUpdated: "2025-02-01",
  },
  {
    id: "cor_las_convention",
    name: "LAS – Convention Center",
    status: "proposed",
    cityId: "las_vegas",
    startPoint: { lat: 36.084, lng: -115.1537, label: "LAS Airport" },
    endPoint: { lat: 36.1311, lng: -115.1526, label: "LVCC Rooftop" },
    distanceKm: 6,
    estimatedFlightMinutes: 4,
    maxAltitudeFt: 800,
    notes: "Airport to convention center shuttle corridor.",
    lastUpdated: "2025-02-01",
  },
  {
    id: "cor_mia_fll",
    name: "MIA – Fort Lauderdale",
    status: "proposed",
    cityId: "miami",
    operatorId: "op_archer",
    startPoint: { lat: 25.7959, lng: -80.2870, label: "Miami International Airport" },
    endPoint: { lat: 26.0726, lng: -80.1527, label: "Fort Lauderdale-Hollywood Int'l" },
    waypoints: [{ lat: 25.9300, lng: -80.1200 }],
    distanceKm: 43,
    estimatedFlightMinutes: 20,
    maxAltitudeFt: 1500,
    notes: "Archer/United Airlines partnership corridor. Airport-to-airport route along the coast.",
    sourceUrl: "https://news.archer.com/archer-reveals-plans-for-miami-air-taxi-network-featuring-partnerships-with-related-ross-and-magic-city-innovation-district",
    lastUpdated: "2026-03-01",
  },
  {
    id: "cor_ord_downtown",
    name: "O'Hare – Downtown Chicago",
    status: "proposed",
    cityId: "chicago",
    operatorId: "op_archer",
    startPoint: { lat: 41.9742, lng: -87.9073, label: "O'Hare International" },
    endPoint: { lat: 41.8819, lng: -87.6278, label: "Downtown Chicago" },
    waypoints: [{ lat: 41.9200, lng: -87.7500 }],
    distanceKm: 25,
    estimatedFlightMinutes: 12,
    maxAltitudeFt: 1500,
    notes: "Archer/United targeting O'Hare as a launch corridor. Routing via I-90 corridor.",
    sourceUrl: "https://investors.archer.com/news/news-details/2023/United-Airlines-and-Archer-Announce-First-Commercial-Electric-Air-Taxi-Route-in-Chicago/default.aspx",
    lastUpdated: "2026-03-01",
  },
  {
    id: "cor_atl_midtown",
    name: "ATL – Midtown Atlanta",
    status: "proposed",
    cityId: "atlanta",
    startPoint: { lat: 33.6407, lng: -84.4277, label: "Hartsfield-Jackson Atlanta Int'l" },
    endPoint: { lat: 33.7880, lng: -84.3831, label: "Midtown Atlanta" },
    distanceKm: 18,
    estimatedFlightMinutes: 10,
    maxAltitudeFt: 1500,
    notes: "World's busiest airport to Midtown. Delta/Joby investor angle as natural hub candidate.",
    lastUpdated: "2026-03-01",
  },
];

export const CORRIDORS_MAP: Record<string, Corridor> = Object.fromEntries(
  CORRIDORS.map((c) => [c.id, c])
);

export function getCorridorsForCity(cityId: string): Corridor[] {
  return CORRIDORS.filter((c) => c.cityId === cityId);
}

// ============================================================
// CITIES (raw — scores computed below)
// ============================================================
const RAW_CITIES: City[] = [
  {
    id: "los_angeles", city: "Los Angeles", metro: "Greater Los Angeles Metro", state: "CA", country: "US",
    lat: 34.0522, lng: -118.2437,
    hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 3,
    activeOperators: ["op_joby", "op_archer"],
    regulatoryPosture: "friendly", stateLegislationStatus: "enacted", weatherInfraLevel: "partial",
    heliportCount: 146, heliportPublicCount: 0,
    scoreSources: {
      activePilotProgram: { citation: "Joby and Archer targeting 2025-2026 LA commercial launch", date: "2025-01", url: "https://www.jobyaviation.com/news/" },
      vertiportZoning: { citation: "LA Metro Advanced Air Mobility Infrastructure Study", date: "2024-09", url: "https://www.metro.net/" },
      approvedVertiport: { citation: "Joby LAX Adjacent Vertiport permit filed", date: "2024-08" },
      activeOperatorPresence: { citation: "Joby and Archer active or planning LA operations (Blade operations folded into Joby Aug 2025)", date: "2026-03" },
      regulatoryPosture: { citation: "California Governor's Executive Order on Advanced Air Mobility", date: "2023-10" },
      stateLegislation: { citation: "CA SB 944 — Advanced Air Mobility Act signed into law", date: "2024-09", url: "https://leginfo.legislature.ca.gov/" },
      weatherInfrastructure: { citation: "Major airport weather stations (LAX, BUR, SNA) provide regional coverage; no dedicated low-altitude AAM sensing deployed", date: "2026-03" },
    },
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "achieved", citation: "CA SB 944 — Advanced Air Mobility Act", citationDate: "2024-09", citationUrl: "https://leginfo.legislature.ca.gov/" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "achieved", citation: "CA UAM Task Force ongoing regulatory development", citationDate: "2025-01" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "achieved", citation: "SB 944 designed to complement federal framework", citationDate: "2024-09" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "achieved", citation: "Joby and Archer targeting LA commercial launch", citationDate: "2025-01" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "achieved", citation: "Joby first UAE point-to-point piloted flight Nov 2025; Archer Abu Dhabi flight tests", citationDate: "2025-11" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "achieved", citation: "LA Metro AAM Infrastructure Study", citationDate: "2024-09" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "achieved", citation: "Joby LAX Adjacent Vertiport permit filed", citationDate: "2024-08" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "partial", citation: "LAX Adjacent in permitting phase, not yet under construction", citationDate: "2024-08" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "achieved", citation: "Archer Santa Monica + DTLA sites planned", citationDate: "2025-02" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "achieved", citation: "Joby and Archer confirmed LA operations", citationDate: "2026-03" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "achieved", citation: "Joby targeting 2026 Dubai commercial launch (pre-commercial); LA confirmed as next US market after Dubai", citationDate: "2025-11" },
        { id: "op_multiple", label: "Multiple operators present", status: "achieved", citation: "Joby and Archer both active", citationDate: "2026-03" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "achieved", citation: "LA Metro vertiport zoning provisions in place", citationDate: "2024-09" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "partial", citation: "Referenced in Metro study; municipal code integration in progress", citationDate: "2024-09" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "achieved", citation: "LAX Adjacent permit filed through established pathway", citationDate: "2024-08" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "achieved", citation: "CA Governor Executive Order on Advanced Air Mobility", citationDate: "2023-10" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "achieved", citation: "California actively supporting AAM development", citationDate: "2023-10" },
        { id: "reg_engagement", label: "Community engagement process", status: "partial", citation: "LA Metro conducting community outreach; formal process developing", citationDate: "2024-09" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "LAX, BUR, SNA ASOS stations provide regional coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing", citation: "No dedicated low-altitude AAM weather sensing deployed", citationDate: "2026-03" },
      ],
    },
    notes: "Primary US launch market for Joby and Archer. Joby targeting 2026 commercial launch in Dubai via 6-year exclusive RTA agreement (pre-commercial; first UAE point-to-point piloted flight Nov 2025). LA is the confirmed next US market after Dubai. Joby acquired Blade's passenger business (Aug 2025), consolidating LA operator presence under two brands. Archer completed Abu Dhabi Midnight flight test campaign. LA Metro actively planning vertiport integration with transit hubs.",
    keyMilestones: ["Joby first UAE point-to-point piloted flight (Nov 2025)", "Joby acquires Blade passenger business (Aug 2025)", "Archer completes Abu Dhabi Midnight flight tests", "Joby/Archer targeting 2026 Dubai then LA commercial ops", "CA UAM Task Force active"],
    lastUpdated: "2026-03-03",
  },
  {
    id: "new_york", city: "New York", metro: "New York Metro", state: "NY", country: "US",
    lat: 40.7128, lng: -74.0060,
    hasActivePilotProgram: true, hasVertiportZoning: false, vertiportCount: 1,
    activeOperators: ["op_joby", "op_archer"],
    regulatoryPosture: "neutral", stateLegislationStatus: "none", weatherInfraLevel: "partial",
    heliportCount: 39, heliportPublicCount: 3,
    scoreSources: {
      activePilotProgram: { citation: "Joby operating commercial helicopter air taxi service in NYC (via Blade acquisition Aug 2025)", date: "2026-03" },
      approvedVertiport: { citation: "Manhattan Heliport — operational West Side heliport (ex-Blade, now Joby)", date: "2026-03" },
      activeOperatorPresence: { citation: "Joby and Archer planning or operating in NYC", date: "2026-03" },
      regulatoryPosture: { citation: "NYC complex airspace — FAA Class B restrictions around JFK/LGA/EWR", date: "2024-12" },
      weatherInfrastructure: { citation: "Major airport weather stations (JFK, LGA, EWR) provide regional coverage; no dedicated low-altitude AAM sensing deployed", date: "2026-03" },
    },
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing", citation: "No NY state UAM legislation enacted", citationDate: "2026-03" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "unknown" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "partial", citation: "NYC local noise/heliport restrictions may conflict with federal preemption", citationDate: "2026-03" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "achieved", citation: "Joby operating NYC air taxi via Blade acquisition", citationDate: "2026-03" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "partial", citation: "Helicopter operations active; eVTOL flights pending certification", citationDate: "2026-03" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "missing", citation: "No formal NYC municipal UAM commitment", citationDate: "2026-03" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "achieved", citation: "Manhattan Heliport operational (West Side)", citationDate: "2026-03" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "achieved", citation: "Manhattan Heliport operational for air taxi", citationDate: "2026-03" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "partial", citation: "JFK corridor sites under evaluation", citationDate: "2026-03" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "achieved", citation: "Joby and Archer targeting NYC", citationDate: "2026-03" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "achieved", citation: "Joby operating NYC helicopter routes (ex-Blade)", citationDate: "2026-03" },
        { id: "op_multiple", label: "Multiple operators present", status: "achieved", citation: "Joby and Archer both planning NYC operations", citationDate: "2026-03" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing", citation: "No NYC vertiport zoning code", citationDate: "2026-03" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing", citation: "NYC codes reference helicopters, not eVTOL/AAM", citationDate: "2026-03" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing", citation: "Helicopter permitting exists but no eVTOL-specific pathway", citationDate: "2026-03" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "missing", citation: "No NYC UAM task force or executive order", citationDate: "2026-03" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "missing", citation: "NYC posture is neutral — complex airspace challenges", citationDate: "2024-12" },
        { id: "reg_engagement", label: "Community engagement process", status: "missing", citation: "No formal UAM community engagement process", citationDate: "2026-03" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "JFK, LGA, EWR ASOS stations provide coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing", citation: "No dedicated low-altitude AAM sensing deployed", citationDate: "2026-03" },
      ],
    },
    notes: "Joby acquired Blade's passenger business (Aug 2025), gaining NYC terminal network including JFK, Newark, Manhattan West Side, East Side, and Wall Street lounges. Dense airspace creates integration challenges but demand signal is enormous. JFK-Manhattan corridor is a natural first eVTOL route.",
    keyMilestones: ["Joby acquires Blade NYC terminals (Aug 2025)", "Joby NYC helicopter ops active (ex-Blade)", "Joby targeting JFK/Manhattan eVTOL corridor", "Archer/United partnership announced"],
    lastUpdated: "2026-03-03",
  },
  {
    id: "dallas", city: "Dallas", metro: "Dallas–Fort Worth Metro", state: "TX", country: "US",
    lat: 32.7767, lng: -96.7970,
    hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 2,
    activeOperators: ["op_wisk"],
    regulatoryPosture: "friendly", stateLegislationStatus: "enacted", weatherInfraLevel: "partial",
    heliportCount: 69, heliportPublicCount: 2,
    scoreSources: {
      activePilotProgram: { citation: "Wisk Aero autonomous flight testing active near DFW", date: "2024-11" },
      vertiportZoning: { citation: "City of Dallas vertiport zoning code amendment adopted", date: "2024-06" },
      approvedVertiport: { citation: "DFW Vertiport Texas under construction, permit filed Mar 2024", date: "2024-03" },
      activeOperatorPresence: { citation: "Wisk Aero conducting autonomous test operations in DFW area", date: "2024-11" },
      regulatoryPosture: { citation: "Texas pro-innovation aviation regulatory framework", date: "2023-06" },
      stateLegislation: { citation: "TX HB 1735 — landmark UAM legislation signed into law", date: "2023-06", url: "https://capitol.texas.gov/BillLookup/History.aspx?LegSess=88R&Bill=HB1735" },
      weatherInfrastructure: { citation: "Major airport weather stations (DFW, DAL) provide regional coverage; no dedicated low-altitude AAM sensing deployed", date: "2026-03" },
    },
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "achieved", citation: "TX HB 1735 — landmark UAM legislation", citationDate: "2023-06", citationUrl: "https://capitol.texas.gov/BillLookup/History.aspx?LegSess=88R&Bill=HB1735" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "achieved", citation: "TX HB 1735 enacted; federal air taxi pilot program selected Texas (2026)", citationDate: "2026-03" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "achieved", citation: "HB 1735 designed to complement federal UAM framework", citationDate: "2023-06" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "achieved", citation: "Wisk Aero autonomous flight testing partnership near DFW", citationDate: "2024-11" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "achieved", citation: "Wisk Gen 6 first flight completed Dec 2025", citationDate: "2025-12" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "achieved", citation: "City of Dallas vertiport zoning + DFW feasibility study", citationDate: "2024-06" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "achieved", citation: "DFW Vertiport Texas permit filed", citationDate: "2024-03" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "achieved", citation: "DFW Vertiport Texas under construction", citationDate: "2024-03" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "achieved", citation: "Wisk Corridor Vertiport in planning", citationDate: "2024-11" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "achieved", citation: "Wisk Aero conducting DFW test operations", citationDate: "2024-11" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "achieved", citation: "Wisk actively flight testing autonomous eVTOL", citationDate: "2025-12" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing", citation: "Only Wisk active in DFW currently", citationDate: "2026-03" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "achieved", citation: "City of Dallas vertiport zoning code amendment", citationDate: "2024-06" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "achieved", citation: "Zoning amendment specifically references vertiport/eVTOL operations", citationDate: "2024-06" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "achieved", citation: "DFW Vertiport Texas permitted through established pathway", citationDate: "2024-03" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "achieved", citation: "Texas pro-innovation aviation regulatory framework", citationDate: "2023-06" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "achieved", citation: "Texas actively supporting AAM development", citationDate: "2023-06" },
        { id: "reg_engagement", label: "Community engagement process", status: "partial", citation: "DFW vertiport process included public comment; broader engagement developing", citationDate: "2024-06" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "DFW and DAL ASOS stations provide coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing", citation: "No dedicated low-altitude AAM sensing deployed", citationDate: "2026-03" },
      ],
    },
    notes: "Texas passed landmark UAM-friendly legislation (HB 1735) in 2023. Wisk completed first flight of Gen 6 autonomous eVTOL (Dec 2025) — the first FAA type certification candidate for autonomous passenger eVTOL. Joby targeting 2026 Dubai commercial launch (pre-commercial; first UAE piloted flight Nov 2025). Dallas is a primary US target market.",
    keyMilestones: ["Wisk Gen 6 autonomous eVTOL first flight (Dec 2025)", "Joby first UAE piloted flight (Nov 2025)", "TX HB 1735 passed 2023", "DFW vertiport feasibility study complete"],
    lastUpdated: "2026-03-03",
  },
  {
    id: "miami", city: "Miami", metro: "Greater Miami Metro", state: "FL", country: "US",
    lat: 25.7617, lng: -80.1918,
    hasActivePilotProgram: false, hasVertiportZoning: true, vertiportCount: 2,
    activeOperators: ["op_joby", "op_archer"],
    regulatoryPosture: "friendly", stateLegislationStatus: "enacted", weatherInfraLevel: "partial",
    heliportCount: 37, heliportPublicCount: 0,
    scoreSources: {
      vertiportZoning: { citation: "Miami-Dade TPO UAM Policy Framework and Strategic Roadmap (Kimley-Horn, Nov 2023) recommended vertiport siting study; Miami-Dade rezoned Watson Island for heliport/vertiport use (2016)", date: "2023-11" },
      approvedVertiport: { citation: "Blade Lounge at Opa-Locka Executive (OPF) operational for helicopter air taxi (now Joby subsidiary); Watson Island Heliport (Skyports/Linden) under development with 30-year city lease", date: "2026-04" },
      activeOperatorPresence: { citation: "Joby operating Miami helicopter air taxi from OPF (via Blade acquisition Aug 2025); Archer planning MIA–FLL corridor with United Airlines; Archer Miami network announced Dec 2025 with Related Ross + Magic City Innovation District", date: "2026-04" },
      regulatoryPosture: { citation: "Florida pro-aviation regulatory posture; FDOT AAM Business Plan (Nov 2025) identifies 18-airport network with 30+ vertiport sites from 239K parcel analysis", date: "2025-11" },
      stateLegislation: { citation: "Florida Advanced Air Mobility Act signed into law", date: "2024-05" },
      weatherInfrastructure: { citation: "MIA, FLL ASOS stations provide regional coverage; no dedicated low-altitude AAM sensing deployed", date: "2026-03" },
    },
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "achieved", citation: "Florida Advanced Air Mobility Act", citationDate: "2024-05" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "achieved", citation: "FL AAM Act enacted; FDOT actively supporting implementation", citationDate: "2024-06" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "achieved", citation: "FL AAM Act designed to complement federal framework", citationDate: "2024-05" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "partial", citation: "Joby operating helicopter air taxi from OPF (ex-Blade); no formal municipal MOU with eVTOL operator", citationDate: "2026-04" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing", citation: "No eVTOL demo flights in Miami market; Archer selected for White House eVTOL pilot program but flights not yet conducted", citationDate: "2026-04" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "partial", citation: "Miami-Dade TPO UAM Policy Framework (Nov 2023) recommended vertiport siting; Watson Island 30-year lease approved (2016); no formal eVTOL-specific municipal partnership", citationDate: "2023-11" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "achieved", citation: "Blade Lounge at OPF operational; Watson Island Heliport (Skyports/Linden) has city lease and rezoning approval", citationDate: "2026-04" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "achieved", citation: "Watson Island Heliport under development — 55,807 sq ft city lease, Skyports MOU (Jan 2026), occupancy permits in process", citationDate: "2026-04" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "achieved", citation: "Archer Miami network (Dec 2025): Related Ross (West Palm Beach), Magic City Innovation District (Little Haiti), Hard Rock Stadium, Apogee Golf Club; MIA-FLL corridor sites under evaluation", citationDate: "2025-12" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "achieved", citation: "Joby (via Blade acquisition) and Archer (Miami network Dec 2025) committed to Miami market", citationDate: "2026-04" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "achieved", citation: "Joby operating helicopter air taxi routes from OPF; Blade seaplane ops from Watson Island (X44)", citationDate: "2026-04" },
        { id: "op_multiple", label: "Multiple operators present", status: "achieved", citation: "Joby operating (ex-Blade) + Archer planning MIA-FLL with United Airlines + Vertical Aerospace announced South Florida network", citationDate: "2026-04" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "achieved", citation: "Watson Island rezoned from Public Parks to Major Institutional/Transportation/Utilities (2016); Miami-Dade TPO strategic roadmap in place", citationDate: "2023-11" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "partial", citation: "Referenced in TPO UAM Policy Framework (2023); FDOT Land Use Compatibility Guidebook published for local governments; formal municipal code integration pending", citationDate: "2025-11" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "partial", citation: "Heliport permitting active (Watson Island); eVTOL-specific permitting pathway developing via FDOT AAM Business Plan", citationDate: "2026-04" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "achieved", citation: "FDOT actively supporting AAM infrastructure", citationDate: "2024-06" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "achieved", citation: "Florida pro-aviation regulatory posture", citationDate: "2024-06" },
        { id: "reg_engagement", label: "Community engagement process", status: "unknown" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "MIA, FLL ASOS stations provide coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing", citation: "No dedicated low-altitude AAM sensing deployed", citationDate: "2026-03" },
      ],
    },
    notes: "Florida is one of the most UAM-progressive states. Joby operates helicopter air taxi from Blade Lounge at OPF (via Blade acquisition Aug 2025). Blade seaplane ops continue from Watson Island X44. Watson Island Heliport (Skyports/Linden) under development as dedicated AAM hub — 30-year city lease, occupancy permits pending. Archer announced Miami network Dec 2025 (Related Ross, Magic City, Hard Rock Stadium, Apogee Golf Club) with United Airlines MIA–FLL corridor. FDOT AAM Business Plan (Nov 2025) analyzed 239K parcels for 30+ vertiport sites statewide.",
    keyMilestones: ["FL UAM Act signed (May 2024)", "Miami-Dade TPO UAM Policy Framework published (Nov 2023)", "Joby acquires Blade operations (Aug 2025)", "FDOT AAM Business Plan — 239K parcel analysis (Nov 2025)", "Archer Miami network announced with Related Ross + Magic City (Dec 2025)", "Skyports/Linden Watson Island MOU signed (Jan 2026)", "Archer selected for White House eVTOL pilot program (2026)"],
    lastUpdated: "2026-04-12",
  },
  {
    id: "orlando", city: "Orlando", metro: "Greater Orlando Metro", state: "FL", country: "US",
    lat: 28.5383, lng: -81.3792,
    hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 1,
    activeOperators: [],
    regulatoryPosture: "friendly", stateLegislationStatus: "enacted", weatherInfraLevel: "partial",
    heliportCount: 44, heliportPublicCount: 0,
    scoreSources: {
      activePilotProgram: { citation: "Lake Nona smart city UAM pilot program active", date: "2024-10" },
      vertiportZoning: { citation: "Orange County vertiport zoning provisions adopted", date: "2024-08" },
      approvedVertiport: { citation: "Lake Nona Vertiport permitted, FDOT-funded feasibility study", date: "2024-11" },
      regulatoryPosture: { citation: "Florida FDOT actively supporting AAM infrastructure", date: "2024-06" },
      stateLegislation: { citation: "Florida Advanced Air Mobility Act applies statewide", date: "2024-05" },
      weatherInfrastructure: { citation: "Major airport weather stations (MCO, SFB) provide regional coverage; no dedicated low-altitude AAM sensing deployed", date: "2026-03" },
    },
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "achieved", citation: "Florida Advanced Air Mobility Act", citationDate: "2024-05" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "achieved", citation: "FL AAM Act enacted statewide", citationDate: "2024-05" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "achieved", citation: "FL AAM Act complements federal framework", citationDate: "2024-05" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "partial", citation: "Lake Nona smart city pilot; no specific operator MOU confirmed", citationDate: "2024-10" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "unknown" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "achieved", citation: "Lake Nona smart city UAM pilot program", citationDate: "2024-10" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "achieved", citation: "Lake Nona Vertiport permitted", citationDate: "2024-11" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "partial", citation: "Lake Nona Vertiport in development", citationDate: "2024-11" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "partial", citation: "MCO vertiport feasibility study underway", citationDate: "2024-11" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing", citation: "No operator publicly committed to Orlando market", citationDate: "2026-03" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "achieved", citation: "Orange County vertiport zoning provisions", citationDate: "2024-08" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "partial", citation: "Referenced in zoning provisions", citationDate: "2024-08" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "achieved", citation: "Lake Nona Vertiport permitted through pathway", citationDate: "2024-11" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "achieved", citation: "FDOT actively supporting AAM infrastructure", citationDate: "2024-06" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "achieved", citation: "Florida pro-aviation regulatory posture", citationDate: "2024-06" },
        { id: "reg_engagement", label: "Community engagement process", status: "unknown" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "MCO, SFB ASOS stations provide coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing", citation: "No dedicated low-altitude AAM sensing deployed", citationDate: "2026-03" },
      ],
    },
    notes: "Lake Nona smart city district is an active UAM testbed. Tourism corridor (MCO to Disney/Universal) is a natural premium route. FL legislation applies.",
    keyMilestones: ["Lake Nona UAM pilot live", "MCO vertiport study funded by FDOT"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "las_vegas", city: "Las Vegas", metro: "Las Vegas Metro", state: "NV", country: "US",
    lat: 36.1699, lng: -115.1398,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 1,
    activeOperators: [],
    regulatoryPosture: "neutral", stateLegislationStatus: "none", weatherInfraLevel: "partial",
    heliportCount: 17, heliportPublicCount: 0,
    scoreSources: {
      approvedVertiport: { citation: "LVCC Rooftop Vertiport concept approved, design phase", date: "2024-01" },
      regulatoryPosture: { citation: "Nevada has general drone regulation (NV SB 115) but no UAM-specific legislation", date: "2023-06" },
      weatherInfrastructure: { citation: "LAS airport weather station provides regional coverage; no dedicated low-altitude AAM sensing deployed", date: "2026-03" },
    },
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing", citation: "NV SB 115 is drone regulation, not UAM-specific", citationDate: "2023-06" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "unknown" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "unknown" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "missing" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "missing" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "partial", citation: "LVCC Rooftop Vertiport concept approved, design phase", citationDate: "2024-01" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "unknown" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "missing" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "missing" },
        { id: "reg_engagement", label: "Community engagement process", status: "missing" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "LAS ASOS station provides coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "Tourism and convention economy creates premium shuttle demand. Strip to LAS airport is an obvious first corridor. NV SB 115 is a drone regulation update, not UAM-specific. Clark County vertiport overlay zone not verified in public record. NBAA-BACE conference activity is not a sustained pilot program.",
    keyMilestones: ["LVCC vertiport concept in design phase", "NV SB 115 drone regulation (not UAM-specific)"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "phoenix", city: "Phoenix", metro: "Phoenix Metro", state: "AZ", country: "US",
    lat: 33.4484, lng: -112.0740,
    hasActivePilotProgram: true, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: ["op_joby"],
    regulatoryPosture: "neutral", stateLegislationStatus: "actively_moving", weatherInfraLevel: "partial",
    heliportCount: 48, heliportPublicCount: 0,
    scoreSources: {
      stateLegislation: { citation: "AZ SB1827 (Office of AAM) FAILED 6-12 in House Appropriations (Mar 31, 2026); SB1826 (AAM appropriation) WITHDRAWN in House Appropriations (Mar 25, 2026); SB1819 (Vertiports; design; zoning) remains on Senate consent calendar with no House action since Mar 2, 2026", date: "2026-04", url: "https://www.azleg.gov/" },
    },
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing", citation: "No AZ UAM bill enacted; SB1827 failed and SB1826 withdrawn in House Appropriations (March 2026)", citationDate: "2026-04" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "partial", citation: "Of the three-bill AAM package, only SB1819 (vertiport zoning) remains technically active, stalled on Senate consent calendar; SB1827 and SB1826 died in House Appropriations", citationDate: "2026-04", citationUrl: "https://www.azleg.gov/" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "achieved", citation: "Remaining AZ vertiport bill designed to complement federal framework", citationDate: "2026-04" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "achieved", citation: "Joby conducting autonomous flight testing in Arizona", citationDate: "2026-03" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "achieved", citation: "Joby autonomous flight technology testing active", citationDate: "2026-03" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "partial", citation: "Chandler/Tempe testing corridor; no formal city-level commitment", citationDate: "2026-03" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing", citation: "No approved vertiport sites in Phoenix metro", citationDate: "2026-03" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing", citation: "No vertiport construction in Phoenix metro", citationDate: "2026-03" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "unknown" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "achieved", citation: "Joby conducting Arizona flight testing", citationDate: "2026-03" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "achieved", citation: "Joby actively flight testing in AZ", citationDate: "2026-03" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing", citation: "Only Joby active in Phoenix market", citationDate: "2026-03" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing", citation: "No vertiport zoning ordinance in Phoenix", citationDate: "2026-04" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "partial", citation: "AZ SB1819 would add vertiport zoning language; stalled on Senate consent calendar with no House action since Mar 2, 2026", citationDate: "2026-04" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing", citation: "No eVTOL-specific permitting pathway", citationDate: "2026-04" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "missing", citation: "SB1827 (Office of AAM) failed 6-12 in House Appropriations (Mar 31, 2026); no other task force mechanism", citationDate: "2026-04" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "partial", citation: "Operator testing active (Joby); legislative package collapsed in committee — posture under review", citationDate: "2026-04" },
        { id: "reg_engagement", label: "Community engagement process", status: "unknown" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "PHX, DVT, SDL ASOS/AWOS stations provide coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing", citation: "No dedicated low-altitude AAM sensing deployed", citationDate: "2026-03" },
      ],
    },
    notes: "Arizona's three-bill AAM legislative package collapsed in House Appropriations in late March 2026. SB1827 (Office of Advanced Air Mobility) failed on a 6-12 vote on Mar 31; SB1826 (AAM appropriation) was withdrawn on Mar 25; SB1819 (Vertiports; design; zoning) remains technically alive on a Senate consent calendar but has shown no House movement since Mar 2. The `stateLegislationStatus: actively_moving` flag is under methodology review — SB1819's technical status preserves it for now, but a downgrade to `none` would drop Phoenix to 40 and a tier boundary. Joby Aviation continues autonomous flight technology testing in Arizona (2026) and Chandler/Tempe testing corridor activity persists, but operator presence does not compensate for the regulatory layer contracting.",
    keyMilestones: ["Joby autonomous flight testing in Arizona (2026)", "AZ SB1827 Office of AAM FAILED 6-12 in House Appropriations (Mar 31, 2026)", "AZ SB1826 AAM appropriation withdrawn in House Appropriations (Mar 25, 2026)", "AZ SB1819 Vertiport zoning stalled on Senate consent calendar", "Chandler/Tempe drone testing activity"],
    lastUpdated: "2026-04-05",
  },
  {
    id: "houston", city: "Houston", metro: "Greater Houston Metro", state: "TX", country: "US",
    lat: 29.7604, lng: -95.3698,
    hasActivePilotProgram: true, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "friendly", stateLegislationStatus: "enacted", weatherInfraLevel: "partial",
    heliportCount: 68, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "achieved", citation: "TX HB 1735 applies statewide", citationDate: "2023-06" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "achieved", citation: "Federal air taxi pilot program selected Texas", citationDate: "2026-03" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "achieved", citation: "HB 1735 complements federal framework", citationDate: "2023-06" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "partial", citation: "Federal air taxi pilot program; no Houston-specific operator MOU", citationDate: "2026-03" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "partial", citation: "IAH exploring vertiport feasibility", citationDate: "2026-03" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "partial", citation: "IAH exploring vertiport feasibility", citationDate: "2026-03" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing", citation: "No local vertiport zoning code adopted", citationDate: "2026-03" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "achieved", citation: "TxDOT active AAM work", citationDate: "2026-03" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "achieved", citation: "Texas pro-innovation aviation framework", citationDate: "2023-06" },
        { id: "reg_engagement", label: "Community engagement process", status: "unknown" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "IAH, HOU ASOS stations provide coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "Texas HB 1735 creates statewide favorable environment and TxDOT has active AAM work, but Houston has no local vertiport zoning code adopted. Extreme sprawl and lack of mass transit creates one of the strongest UAM demand cases in the country. Texas selected for federal air taxi pilot program (2026).",
    keyMilestones: ["Federal air taxi pilot program (2026)", "TX HB 1735 applies statewide", "No local vertiport zoning adopted", "IAH exploring vertiport feasibility"],
    lastUpdated: "2026-03-20",
  },
  {
    id: "austin", city: "Austin", metro: "Austin Metro", state: "TX", country: "US",
    lat: 30.2672, lng: -97.7431,
    hasActivePilotProgram: true, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "friendly", stateLegislationStatus: "enacted", weatherInfraLevel: "partial",
    heliportCount: 21, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "achieved", citation: "TX HB 1735 applies statewide", citationDate: "2023-06" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "achieved", citation: "Federal air taxi pilot program selected Texas", citationDate: "2026-03" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "achieved", citation: "HB 1735 complements federal framework", citationDate: "2023-06" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "partial", citation: "Federal air taxi pilot program; no Austin-specific operator MOU", citationDate: "2026-03" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "partial", citation: "AUS airport mobility study initiated", citationDate: "2026-03" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "unknown" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "achieved", citation: "TxDOT active AAM work", citationDate: "2026-03" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "achieved", citation: "Texas pro-innovation aviation framework", citationDate: "2023-06" },
        { id: "reg_engagement", label: "Community engagement process", status: "unknown" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "AUS ASOS station provides coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "Tech hub culture + Texas legislation = high potential but no local vertiport zoning code adopted. SXSW creates annual demo opportunities. AUS airport actively studying UAM. Strong VC community for early adoption. Texas selected for federal air taxi pilot program (2026).",
    keyMilestones: ["Federal air taxi pilot program (2026)", "TX HB 1735 applies", "No local vertiport zoning adopted", "AUS airport mobility study initiated"],
    lastUpdated: "2026-03-20",
  },
  {
    id: "san_diego", city: "San Diego", metro: "San Diego Metro", state: "CA", country: "US",
    lat: 32.7157, lng: -117.1611,
    hasActivePilotProgram: false, hasVertiportZoning: true, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "friendly", stateLegislationStatus: "enacted", weatherInfraLevel: "partial",
    heliportCount: 16, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "achieved", citation: "CA SB 944 applies statewide", citationDate: "2024-09" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "achieved", citation: "CA UAM Task Force ongoing", citationDate: "2025-01" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "achieved", citation: "SB 944 complements federal framework", citationDate: "2024-09" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "missing" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "unknown" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "unknown" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "achieved", citation: "San Diego vertiport zoning provisions", citationDate: "2025-02" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "unknown" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "unknown" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "achieved", citation: "CA Governor Executive Order on AAM", citationDate: "2023-10" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "achieved", citation: "California actively supporting AAM", citationDate: "2023-10" },
        { id: "reg_engagement", label: "Community engagement process", status: "unknown" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "SAN ASOS station provides coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "CA legislation applies. Military/defense presence creates drone testing infrastructure. SAN-LAX corridor is a compelling regional air mobility use case.",
    keyMilestones: ["CA UAM task force active", "Miramar UAM testing discussions reported"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "san_francisco", city: "San Francisco", metro: "SF Bay Area Metro", state: "CA", country: "US",
    lat: 37.7749, lng: -122.4194,
    hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 0,
    activeOperators: ["op_joby"],
    regulatoryPosture: "neutral", stateLegislationStatus: "enacted", weatherInfraLevel: "partial",
    heliportCount: 17, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "achieved", citation: "CA SB 944 applies statewide", citationDate: "2024-09" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "achieved", citation: "CA UAM Task Force ongoing", citationDate: "2025-01" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "achieved", citation: "SB 944 complements federal framework", citationDate: "2024-09" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "achieved", citation: "Joby conducting SF Bay demo flights", citationDate: "2026-03" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "achieved", citation: "Joby Golden Gate eVTOL demonstration flight", citationDate: "2026-03" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "partial", citation: "SFO studying eVTOL integration; no formal city commitment", citationDate: "2026-03" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "unknown" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "achieved", citation: "Joby targeting SF Bay Area", citationDate: "2026-03" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "achieved", citation: "Joby completed SF Bay demo flights", citationDate: "2026-03" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing", citation: "Only Joby active in SF market", citationDate: "2026-03" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "achieved", citation: "SF vertiport zoning provisions", citationDate: "2026-03" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "unknown" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "unknown" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "achieved", citation: "CA Governor Executive Order on AAM", citationDate: "2023-10" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "partial", citation: "CA supportive but SF dense airspace creates challenges", citationDate: "2026-03" },
        { id: "reg_engagement", label: "Community engagement process", status: "unknown" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "SFO, OAK ASOS stations provide coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "Joby Aviation completed multiple piloted eVTOL demonstration flights across San Francisco Bay including the Golden Gate flight (2026). Dense airspace and political headwinds slow progress despite being the tech capital. Strong VC interest. SFO to downtown SF is an obvious corridor once regulations allow.",
    keyMilestones: ["Joby Golden Gate eVTOL demonstration flight (2026)", "CA UAM task force active", "SFO studying eVTOL integration"],
    lastUpdated: "2026-03-20",
  },
  {
    id: "chicago", city: "Chicago", metro: "Chicagoland Metro", state: "IL", country: "US",
    lat: 41.8781, lng: -87.6298,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: ["op_archer"],
    regulatoryPosture: "neutral", stateLegislationStatus: "actively_moving", weatherInfraLevel: "partial",
    heliportCount: 25, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing", citation: "No IL UAM bill enacted", citationDate: "2026-03" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "achieved", citation: "IL HB3190 on 2nd reading calendar", citationDate: "2026-03", citationUrl: "https://legiscan.com/IL/bill/HB3190/2025" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "unknown" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "achieved", citation: "Archer/United Airlines targeting Chicago", citationDate: "2026-03" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "partial", citation: "Archer Abu Dhabi flight tests completed (not in Chicago)", citationDate: "2026-03" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "missing" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "partial", citation: "ORD downtown corridor concept proposed", citationDate: "2026-03" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "achieved", citation: "Archer publicly committed to Chicago launch", citationDate: "2026-03" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "partial", citation: "Archer has United partnership but no Chicago-specific operations yet", citationDate: "2026-03" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "missing" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "missing" },
        { id: "reg_engagement", label: "Community engagement process", status: "missing" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "ORD, MDW ASOS stations provide coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "Archer targeting Chicago as a launch city with United Airlines partnership. ORD to downtown corridor proposed. Archer completed Abu Dhabi flight test campaign and has NVIDIA/Starlink partnerships accelerating autonomy development. IL HB3190 (AERONAUTICS-UNMANNED AIRCRAFT) on calendar for 2nd reading.",
    keyMilestones: ["Archer/United O'Hare corridor announced", "Archer Abu Dhabi flight tests completed", "United Airlines investment in Archer confirmed", "IL HB3190 aeronautics bill on 2nd reading calendar"],
    scoreSources: { stateLegislation: { citation: "IL HB3190 (AERONAUTICS-UNMANNED AIRCRAFT) placed on calendar for 2nd reading", date: "2026-03", url: "https://legiscan.com/IL/bill/HB3190/2025" } },
    lastUpdated: "2026-03-14",
  },
  {
    id: "atlanta", city: "Atlanta", metro: "Greater Atlanta Metro", state: "GA", country: "US",
    lat: 33.7490, lng: -84.3880,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", stateLegislationStatus: "none", weatherInfraLevel: "partial",
    heliportCount: 27, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "unknown" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "unknown" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "missing" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "missing" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "partial", citation: "ATL long-range plan studying UAM infrastructure", citationDate: "2025-02" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "partial", citation: "Delta invested in Joby; no formal Atlanta commitment", citationDate: "2025-02" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "missing" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "missing" },
        { id: "reg_engagement", label: "Community engagement process", status: "missing" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "ATL ASOS station provides coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "World's busiest airport + Delta HQ (Joby investor) creates compelling airline partnership angle. Massive traffic congestion creates strong demand case.",
    keyMilestones: ["Delta invested in Joby Aviation", "ATL long-range plan studying UAM infrastructure"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "nashville", city: "Nashville", metro: "Nashville Metro", state: "TN", country: "US",
    lat: 36.1627, lng: -86.7816,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", stateLegislationStatus: "none", weatherInfraLevel: "partial",
    heliportCount: 10, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "unknown" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "unknown" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "missing" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "missing" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "unknown" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "missing" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "missing" },
        { id: "reg_engagement", label: "Community engagement process", status: "missing" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "BNA ASOS station provides coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "Rapid population growth and severe traffic congestion creates strong demand signal. BNA expansion plan references future mobility. Strong music/tourism economy for premium services.",
    keyMilestones: ["Nashville 2040 plan references UAM", "BNA expansion includes future mobility study"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "charlotte", city: "Charlotte", metro: "Charlotte Metro", state: "NC", country: "US",
    lat: 35.2271, lng: -80.8431,
    hasActivePilotProgram: true, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", stateLegislationStatus: "none", weatherInfraLevel: "partial",
    heliportCount: 11, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "unknown" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "unknown" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "partial", citation: "NC DOT FAA AAM Integration Pilot Program; no operator-specific MOU", citationDate: "2026-03" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "achieved", citation: "Charlotte Future Mobility Task Force formed", citationDate: "2026-03" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "unknown" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "achieved", citation: "Charlotte Future Mobility Task Force", citationDate: "2026-03" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "partial", citation: "NC DOT participating in FAA pilot; city-level stance neutral", citationDate: "2026-03" },
        { id: "reg_engagement", label: "Community engagement process", status: "unknown" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "CLT ASOS station provides coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "NC DOT joined FAA Advanced Air Mobility Integration Pilot Program for electric aircraft testing (2026). CLT is a major US hub. Dense banking/finance HQs create executive shuttle demand. Fastest-growing major city in Southeast creates infrastructure urgency.",
    keyMilestones: ["NC DOT joins FAA AAM Integration Pilot Program (2026)", "CLT airport long-range plan references UAM", "Charlotte Future Mobility Task Force formed"],
    lastUpdated: "2026-03-20",
  },
  {
    id: "denver", city: "Denver", metro: "Denver Metro", state: "CO", country: "US",
    lat: 39.7392, lng: -104.9903,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", stateLegislationStatus: "none", weatherInfraLevel: "partial",
    heliportCount: 28, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "unknown" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "unknown" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "missing" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "missing" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "unknown" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "missing" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "missing" },
        { id: "reg_engagement", label: "Community engagement process", status: "missing" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "DEN ASOS station provides coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "Mountain resort corridors (Denver to Vail/Aspen/Breckenridge) represent a compelling regional air mobility use case unlike any other US market.",
    keyMilestones: ["DEN airport studying future mobility infrastructure", "CO aerospace corridor designation"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "seattle", city: "Seattle", metro: "Seattle–Tacoma Metro", state: "WA", country: "US",
    lat: 47.6062, lng: -122.3321,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", stateLegislationStatus: "none", weatherInfraLevel: "partial",
    heliportCount: 21, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "unknown" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "unknown" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "missing" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "missing" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "unknown" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "missing" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "missing" },
        { id: "reg_engagement", label: "Community engagement process", status: "missing" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "SEA ASOS station provides coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "Boeing and Amazon presence creates a unique innovation ecosystem. Puget Sound water crossing corridors are a compelling geographic opportunity not available elsewhere.",
    keyMilestones: ["Amazon Prime Air BVLOS ops nearby", "Boeing invested in multiple eVTOL companies"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "boston", city: "Boston", metro: "Greater Boston Metro", state: "MA", country: "US",
    lat: 42.3601, lng: -71.0589,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", stateLegislationStatus: "none", weatherInfraLevel: "partial",
    heliportCount: 11, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "unknown" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "unknown" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "missing" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "partial", citation: "MassPort studying UAM integration at Logan", citationDate: "2025-02" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "unknown" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "missing" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "missing" },
        { id: "reg_engagement", label: "Community engagement process", status: "missing" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "BOS ASOS station provides coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "Logan to downtown harbor crossing is a natural first route — currently takes 45+ min by car. MIT/Harvard research ecosystem. MassPort exploring UAM at Logan.",
    keyMilestones: ["MassPort studying UAM integration at Logan", "MIT UAM research lab established"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "minneapolis", city: "Minneapolis", metro: "Twin Cities Metro", state: "MN", country: "US",
    lat: 44.9778, lng: -93.2650,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", stateLegislationStatus: "none", weatherInfraLevel: "partial",
    heliportCount: 10, heliportPublicCount: 0,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "unknown" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "unknown" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "missing" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "missing" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "unknown" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "missing" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "missing" },
        { id: "reg_engagement", label: "Community engagement process", status: "missing" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "MSP ASOS station provides coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "Cold weather testing ground — any operator validated here works everywhere. MSP is a major Delta hub. Twin Cities sprawl creates transit gaps UAM could address.",
    keyMilestones: ["University of MN UAM research program active"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "washington_dc", city: "Washington D.C.", metro: "DC Metro", state: "DC", country: "US",
    lat: 38.9072, lng: -77.0369,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "restrictive", stateLegislationStatus: "none", weatherInfraLevel: "none",
    heliportCount: 25, heliportPublicCount: 1,
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "missing" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "unknown" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "missing", citation: "SFRA restrictions create unique federal/local conflict", citationDate: "2025-02" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "missing" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "missing" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "missing" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "partial", citation: "DCA/IAD corridor study initiated", citationDate: "2025-02" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "missing" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "missing" },
        { id: "op_multiple", label: "Multiple operators present", status: "missing" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "missing" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "missing" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "missing", citation: "Restrictive — SFRA heavily constrains operations", citationDate: "2025-02" },
        { id: "reg_engagement", label: "Community engagement process", status: "missing" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "missing", citation: "Restricted airspace limits utility of standard weather stations for UAM", citationDate: "2025-02" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "missing" },
      ],
    },
    notes: "Heavily restricted airspace (SFRA) around DC makes UAM operations extremely challenging in the near term. FAA is studying potential exceptions but timeline unclear.",
    keyMilestones: ["FAA studying SFRA exceptions for eVTOL", "DCA/IAD corridor study initiated"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "columbus", city: "Columbus", metro: "Columbus Metro", state: "OH", country: "US",
    lat: 39.9612, lng: -82.9988,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "friendly", stateLegislationStatus: "actively_moving", weatherInfraLevel: "partial",
    heliportCount: 14, heliportPublicCount: 0,
    scoreSources: {
      regulatoryPosture: { citation: "ODOT created dedicated AAM Division (Mar 2025); DriveOhio published nation's first state AAM framework", date: "2025-03", url: "https://www.urbanairmobilitynews.com/uam-infrastructure/ohio-publishes-advanced-air-mobility-framework/" },
      stateLegislation: { citation: "OH HR304 adopted — legislature formally supports vertical takeoff and air mobility; HB 251 (vertiports as aviation infrastructure) passed House, in Senate committee", date: "2026-03" },
      weatherInfrastructure: { citation: "CMH and LCK airport weather stations provide regional coverage; Ohio eIPP proposal includes weather component", date: "2026-03" },
    },
    subIndicators: {
      stateLegislation: [
        { id: "leg_enacted_bill", label: "Enacted state UAM bill", status: "partial", citation: "OH HR304 adopted (non-binding resolution); HB 251 passed House, in Senate committee", citationDate: "2026-03" },
        { id: "leg_active_bill", label: "Active bill in current session", status: "achieved", citation: "HB 251 (vertiports as aviation infrastructure) in Senate committee", citationDate: "2026-03" },
        { id: "leg_federal_alignment", label: "Federal preemption risk low", status: "achieved", citation: "Ohio framework designed to complement federal standards", citationDate: "2026-03" },
      ],
      activePilotProgram: [
        { id: "pilot_operator_mou", label: "Active MOU with eVTOL operator", status: "achieved", citation: "Ohio multi-state eIPP proposal with BETA/Joby/DHL", citationDate: "2026-01" },
        { id: "pilot_demo_flights", label: "Demo flights completed", status: "partial", citation: "SkyVision UAS test site operational; eVTOL flights pending", citationDate: "2026-03" },
        { id: "pilot_municipal_commitment", label: "Municipal commitment documented", status: "achieved", citation: "ODOT created dedicated AAM Division; DriveOhio AAM framework", citationDate: "2025-03" },
      ],
      approvedVertiport: [
        { id: "vp_approved_sites", label: "Approved vertiport site(s)", status: "missing" },
        { id: "vp_construction", label: "Vertiport under construction or built", status: "missing" },
        { id: "vp_planning", label: "Additional sites in planning pipeline", status: "partial", citation: "DriveOhio AAM framework includes vertiport recommendations", citationDate: "2025-03" },
      ],
      activeOperatorPresence: [
        { id: "op_committed", label: "Operator publicly committed to market", status: "partial", citation: "Joby manufacturing in Dayton; eIPP proposal includes Columbus operations", citationDate: "2026-01" },
        { id: "op_beyond_announce", label: "Operator beyond announcement stage", status: "achieved", citation: "Joby Dayton propeller facility operational (Oct 2025)", citationDate: "2025-10" },
        { id: "op_multiple", label: "Multiple operators present", status: "partial", citation: "BETA Technologies in eIPP proposal; Joby manufacturing", citationDate: "2026-01" },
      ],
      vertiportZoning: [
        { id: "zone_ordinance", label: "Vertiport zoning ordinance adopted", status: "missing" },
        { id: "zone_aam_terminology", label: "AAM/eVTOL terminology in codes", status: "partial", citation: "HB 251 would define vertiports as aviation infrastructure", citationDate: "2026-03" },
        { id: "zone_permitting", label: "Clear permitting pathway defined", status: "missing" },
      ],
      regulatoryPosture: [
        { id: "reg_task_force", label: "Executive order or UAM task force", status: "achieved", citation: "ODOT AAM Division created; DriveOhio framework published", citationDate: "2025-03", citationUrl: "https://www.urbanairmobilitynews.com/uam-infrastructure/ohio-publishes-advanced-air-mobility-framework/" },
        { id: "reg_proactive", label: "Proactive regulatory stance", status: "achieved", citation: "Ohio has nation's most organized state AAM strategy", citationDate: "2025-03" },
        { id: "reg_engagement", label: "Community engagement process", status: "partial", citation: "State-level engagement strong; local Columbus process developing", citationDate: "2026-03" },
      ],
      weatherInfrastructure: [
        { id: "wx_asos", label: "ASOS/AWOS station coverage", status: "achieved", citation: "CMH, LCK ASOS stations provide coverage", citationDate: "2026-03" },
        { id: "wx_low_alt", label: "Low-altitude weather sensing", status: "partial", citation: "Ohio eIPP proposal includes weather component", citationDate: "2026-03" },
      ],
    },
    notes: "Ohio has arguably the most organized state-level AAM strategy in the US. DriveOhio published the nation's first AAM framework covering route planning, vertiport recommendations, and a strategic roadmap. ODOT created a dedicated AAM Division (Mar 2025) led by Robert Tanner, co-located with the National Advanced Air Mobility Center of Excellence in Springfield. Ohio submitted a multi-state eIPP proposal (Jan 2026) with BETA Technologies, Joby, and DHL for medical cargo between Indianapolis, Columbus, and Akron. Joby operates a propeller blade manufacturing facility in Dayton (opened Oct 2025) with plans for 700K+ sq ft expansion to support 500 aircraft/year production. HB 251 — defining vertiports as aviation infrastructure under Ohio law — passed the House and is in Senate committee. SkyVision FAA-designated UAS test site at Springfield-Beckley provides BVLOS testing capability. State estimates $13B AAM economic impact through 2045.",
    keyMilestones: [
      "DriveOhio publishes nation's first state AAM framework",
      "ODOT creates dedicated AAM Division (Mar 2025)",
      "Ohio submits multi-state eIPP proposal with BETA/Joby/DHL (Jan 2026)",
      "Joby opens Dayton propeller manufacturing facility (Oct 2025)",
      "Joby acquires second 700K sq ft Dayton facility (Jan 2026)",
      "HB 251 (vertiport/heliport infrastructure) passes House, in Senate committee",
      "SkyVision FAA-designated UAS test site operational in Springfield",
    ],
    lastUpdated: "2026-03-07",
  },

  // ── New markets added April 2026 (from MarketLead pipeline) ──

  {
    id: "tampa",
    city: "Tampa",
    state: "FL",
    metro: "Tampa Bay",
    country: "US",
    lat: 27.9506,
    lng: -82.4572,
    hasActivePilotProgram: false,
    hasVertiportZoning: false,
    vertiportCount: 0,
    activeOperators: ["op_joby"],
    regulatoryPosture: "neutral" as const,
    stateLegislationStatus: "enacted" as const,
    weatherInfraLevel: "partial" as const,
    heliportCount: 37,
    heliportPublicCount: 2,
    subIndicators: {},
    notes: "Joby conducted FAA-conforming test flights at Tampa International Airport (Mar 2026). Florida has enacted AAM legislation. Tampa has strong airport authority engagement but no vertiport zoning framework yet. Added to index via pipeline signal detection.",
    keyMilestones: [
      "Joby FAA-conforming test flights at TPA (Mar 2026)",
      "Florida Advanced Air Mobility Act enacted",
    ],
    lastUpdated: "2026-04-03",
  },
  {
    id: "san_antonio",
    city: "San Antonio",
    state: "TX",
    metro: "San Antonio–New Braunfels",
    country: "US",
    lat: 29.4241,
    lng: -98.4936,
    hasActivePilotProgram: false,
    hasVertiportZoning: false,
    vertiportCount: 0,
    activeOperators: ["op_archer"],
    regulatoryPosture: "neutral" as const,
    stateLegislationStatus: "enacted" as const,
    weatherInfraLevel: "partial" as const,
    heliportCount: 44,
    heliportPublicCount: 1,
    subIndicators: {},
    notes: "Archer announced Texas cities for federal flying taxi program participation. Texas has the strongest legislative framework in the US (HB 1735 enacted). TxDOT selected for DOT/FAA eIPP (Apr 2026). San Antonio is 7th largest US city. Added to index via pipeline signal detection.",
    keyMilestones: [
      "Archer federal program Texas cities announcement (Mar 2026)",
      "Texas HB 1735 enacted — gold standard AAM legislation",
      "TxDOT selected for DOT/FAA eVTOL Integration Pilot Program (Apr 2026)",
    ],
    lastUpdated: "2026-04-03",
  },
  {
    id: "cincinnati",
    city: "Cincinnati",
    state: "OH",
    metro: "Cincinnati\u2013Northern Kentucky",
    country: "US",
    lat: 39.1031,
    lng: -84.5120,
    hasActivePilotProgram: false,
    hasVertiportZoning: false,
    vertiportCount: 0,
    activeOperators: ["op_joby"],
    regulatoryPosture: "friendly" as const,
    stateLegislationStatus: "actively_moving" as const,
    weatherInfraLevel: "partial" as const,
    heliportCount: 42,
    heliportPublicCount: 2,
    subIndicators: {},
    notes: "CVG is DHL Americas superhub and Amazon Air's primary US hub — the cargo eVTOL capital of the US. Named partner in Ohio multi-state eIPP proposal (BETA Technologies, Joby, DHL) for medical cargo between Cincinnati, Columbus, and Dayton. MidAmerica Flyway corridor strategy linking Cincinnati, Dayton, Louisville. Strong cargo logistics angle — the first commercially viable eVTOL use case. Ohio DriveOhio framework applies. HB 251 (vertiport infrastructure) actively moving in state legislature.",
    keyMilestones: [
      "CVG named in Ohio multi-state eIPP proposal (BETA/Joby/DHL medical cargo)",
      "DHL Americas superhub at CVG — largest cargo carrier in the US",
      "Amazon Air primary US hub at CVG",
      "MidAmerica Flyway corridor strategy (Cincinnati\u2013Dayton\u2013Louisville)",
      "Ohio HB 251 vertiport infrastructure bill in Senate committee",
    ],
    lastUpdated: "2026-04-04",
  },
  {
    id: "salt_lake_city",
    city: "Salt Lake City",
    state: "UT",
    metro: "Salt Lake City–Ogden–Provo",
    country: "US",
    lat: 40.7608,
    lng: -111.8910,
    hasActivePilotProgram: false,
    hasVertiportZoning: false,
    vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "friendly" as const,
    stateLegislationStatus: "enacted" as const,
    weatherInfraLevel: "partial" as const,
    heliportCount: 18,
    heliportPublicCount: 1,
    subIndicators: {},
    notes: "Utah enacted SB 225 (Advanced Air Mobility Act) and passed SCR 010 (Concurrent Resolution Emphasizing Utah's Commitment to AAM). Utah is leading a five-state electric flight pilot program. Progressive state approach to aviation technology. Added to index via pipeline signal detection.",
    keyMilestones: [
      "Utah SB 225 (Advanced Air Mobility Act) enacted",
      "SCR 010 (Commitment to AAM resolution) passed",
      "Utah leading five-state electric flight pilot program",
    ],
    lastUpdated: "2026-04-03",
  },
];

// Apply scoring to all cities and sort by score descending
export const CITIES: City[] = RAW_CITIES.map((city) => {
  const { score, breakdown } = calculateReadinessScore(city);
  return { ...city, score, breakdown };
}).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

export const CITIES_MAP: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.id, c])
);

// State abbreviation → city IDs (derived from CITIES, used by classifier + rules engine)
export const STATE_TO_CITIES: Record<string, string[]> = CITIES.reduce(
  (acc, city) => {
    const state = city.state.toUpperCase();
    if (!acc[state]) acc[state] = [];
    acc[state].push(city.id);
    return acc;
  },
  {} as Record<string, string[]>
);

// Market count for use in copy/prompts (avoids hardcoding "20")
export const MARKET_COUNT = CITIES.length;

// ============================================================
// DYNAMIC CITIES (with DB overrides)
// ============================================================

let cachedCities: City[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

export function invalidateCitiesCache() {
  cachedCities = null;
  cacheTimestamp = 0;
}

/**
 * Returns cities with active high-confidence scoring overrides merged in.
 * Scores are recalculated with overrides applied.
 * Falls back to static CITIES when no overrides exist or DB is unavailable.
 */
export async function getCitiesWithOverrides(): Promise<City[]> {
  const now = Date.now();
  if (cachedCities && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedCities;
  }

  try {
    // Dynamic import to prevent client bundle contamination
    const { prisma } = await import("@/lib/prisma");

    const overrides = await prisma.scoringOverride.findMany({
      where: {
        confidence: "high",
        appliedAt: { not: null },
        supersededAt: null,
      },
    });

    if (overrides.length === 0) {
      cachedCities = CITIES;
      cacheTimestamp = now;
      return CITIES;
    }

    // Group overrides by city, translating legacy override field names to
    // the canonical City interface field names that scoring reads.
    const overridesByCity = new Map<string, Record<string, unknown>>();
    for (const override of overrides) {
      const existing = overridesByCity.get(override.cityId) ?? {};
      if (override.field === "approvedVertiport" && override.value === true) {
        existing["vertiportCount"] = Math.max((existing["vertiportCount"] as number) ?? 0, 1);
      } else if (override.field === "activeOperatorPresence" && override.value === true) {
        const current = (existing["activeOperators"] as string[]) ?? [];
        if (!current.includes("__override__")) current.push("__override__");
        existing["activeOperators"] = current;
      } else if (override.field === "hasStateLegislation") {
        existing["stateLegislationStatus"] = override.value;
      } else {
        existing[override.field] = override.value;
      }
      overridesByCity.set(override.cityId, existing);
    }

    // Rebuild cities with overrides merged — use FKB weights from DB
    const citiesUnsorted = await Promise.all(
      RAW_CITIES.map(async (city) => {
        const cityOverrides = overridesByCity.get(city.id);
        const merged = cityOverrides ? { ...city, ...cityOverrides } : city;
        const { score, breakdown } = await calculateReadinessScoreFromFkb(merged as City);
        return { ...merged, score, breakdown } as City;
      })
    );
    const cities = citiesUnsorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    cachedCities = cities;
    cacheTimestamp = now;
    return cities;
  } catch (err) {
    console.error("[seed] Failed to load overrides, falling back to static data:", err);
    return CITIES;
  }
}

export async function getCitiesMapWithOverrides(): Promise<Record<string, City>> {
  const cities = await getCitiesWithOverrides();
  return Object.fromEntries(cities.map((c) => [c.id, c]));
}
