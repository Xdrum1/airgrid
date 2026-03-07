import { Operator, City, Vertiport, Corridor } from "@/types";
import { calculateReadinessScore } from "@/lib/scoring";

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
    keyPartnerships: ["Uber", "Delta Airlines", "Toyota", "Dubai RTA", "Blade Air Mobility (acquired Aug 2025)"],
    activeMarkets: ["los_angeles", "new_york", "miami"],
    color: "#00d4ff",
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
    name: "Blade Air Mobility",
    type: "air_taxi_service",
    hq: "New York, NY",
    faaCertStatus: "operational",
    aircraft: ["Various helicopters"],
    funding: "Joby Aviation subsidiary (acquired Aug 2025 for ~$125M)",
    keyPartnerships: ["Joby Aviation (parent company)"],
    activeMarkets: ["new_york", "los_angeles", "miami"],
    color: "#10b981",
    website: "https://www.blade.com",
    lastUpdated: "2026-03-03",
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
    name: "Blade Manhattan Heliport",
    operatorId: "op_blade",
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
    operatorId: "op_blade",
    startPoint: { lat: 40.6413, lng: -73.7781, label: "JFK Airport" },
    endPoint: { lat: 40.7012, lng: -74.009, label: "Manhattan Heliport" },
    waypoints: [{ lat: 40.6101, lng: -73.8448 }],
    distanceKm: 24,
    estimatedFlightMinutes: 14,
    maxAltitudeFt: 2000,
    notes: "Routing via Jamaica Bay to minimize overflown population. Blade now a Joby subsidiary (Aug 2025) — corridor under Joby operational control.",
    lastUpdated: "2026-03-03",
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
    activeOperators: ["op_joby", "op_archer", "op_blade"],
    regulatoryPosture: "friendly", hasStateLegislation: true, hasLaancCoverage: true,
    scoreSources: {
      activePilotProgram: { citation: "Joby and Archer targeting 2025-2026 LA commercial launch", date: "2025-01", url: "https://www.jobyaviation.com/news/" },
      vertiportZoning: { citation: "LA Metro Advanced Air Mobility Infrastructure Study", date: "2024-09", url: "https://www.metro.net/" },
      approvedVertiport: { citation: "Joby LAX Adjacent Vertiport permit filed", date: "2024-08" },
      activeOperatorPresence: { citation: "Joby, Archer, and Blade all active or planning LA operations", date: "2025-01" },
      regulatoryPosture: { citation: "California Governor's Executive Order on Advanced Air Mobility", date: "2023-10" },
      stateLegislation: { citation: "CA SB 944 — Advanced Air Mobility Act signed into law", date: "2024-09", url: "https://leginfo.legislature.ca.gov/" },
      laancCoverage: { citation: "FAA LAANC Authorization active for LA basin airspace", date: "2025-01" },
    },
    notes: "Primary US launch market for Joby and Archer. Joby commercially operational in Dubai (Feb 2026) via Uber Air partnership — LA is the confirmed next US market. Joby acquired Blade's passenger business (Aug 2025), consolidating three operator brands in LA. Archer completed Abu Dhabi Midnight flight test campaign. LA Metro actively planning vertiport integration with transit hubs.",
    keyMilestones: ["Joby launches Uber Air in Dubai (Feb 2026)", "Joby acquires Blade passenger business (Aug 2025)", "Archer completes Abu Dhabi Midnight flight tests", "Joby/Archer targeting 2026 LA commercial ops", "CA UAM Task Force active"],
    lastUpdated: "2026-03-03",
  },
  {
    id: "new_york", city: "New York", metro: "New York Metro", state: "NY", country: "US",
    lat: 40.7128, lng: -74.0060,
    hasActivePilotProgram: true, hasVertiportZoning: false, vertiportCount: 1,
    activeOperators: ["op_joby", "op_archer", "op_blade"],
    regulatoryPosture: "neutral", hasStateLegislation: false, hasLaancCoverage: true,
    scoreSources: {
      activePilotProgram: { citation: "Blade operating commercial helicopter air taxi service in NYC", date: "2025-01", url: "https://www.blade.com" },
      approvedVertiport: { citation: "Blade Manhattan Heliport — operational West Side heliport", date: "2025-01" },
      activeOperatorPresence: { citation: "Joby, Archer, and Blade all planning or operating in NYC", date: "2025-01" },
      regulatoryPosture: { citation: "NYC complex airspace — FAA Class B restrictions around JFK/LGA/EWR", date: "2024-12" },
      laancCoverage: { citation: "FAA LAANC Authorization active for NYC metro airspace", date: "2025-01" },
    },
    notes: "Joby acquired Blade's passenger business (Aug 2025), gaining NYC terminal network including JFK, Newark, Manhattan West Side, East Side, and Wall Street lounges. Dense airspace creates integration challenges but demand signal is enormous. JFK-Manhattan corridor is a natural first eVTOL route.",
    keyMilestones: ["Joby acquires Blade NYC terminals (Aug 2025)", "Blade NYC operational under Joby ownership", "Joby targeting JFK/Manhattan eVTOL corridor", "Archer/United partnership announced"],
    lastUpdated: "2026-03-03",
  },
  {
    id: "dallas", city: "Dallas", metro: "Dallas–Fort Worth Metro", state: "TX", country: "US",
    lat: 32.7767, lng: -96.7970,
    hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 2,
    activeOperators: ["op_wisk"],
    regulatoryPosture: "friendly", hasStateLegislation: true, hasLaancCoverage: true,
    scoreSources: {
      activePilotProgram: { citation: "Wisk Aero autonomous flight testing active near DFW", date: "2024-11" },
      vertiportZoning: { citation: "City of Dallas vertiport zoning code amendment adopted", date: "2024-06" },
      approvedVertiport: { citation: "DFW Vertiport Texas under construction, permit filed Mar 2024", date: "2024-03" },
      activeOperatorPresence: { citation: "Wisk Aero conducting autonomous test operations in DFW area", date: "2024-11" },
      regulatoryPosture: { citation: "Texas pro-innovation aviation regulatory framework", date: "2023-06" },
      stateLegislation: { citation: "TX HB 1735 — landmark UAM legislation signed into law", date: "2023-06", url: "https://capitol.texas.gov/BillLookup/History.aspx?LegSess=88R&Bill=HB1735" },
      laancCoverage: { citation: "FAA LAANC Authorization active for DFW area airspace", date: "2025-01" },
    },
    notes: "Texas passed landmark UAM-friendly legislation (HB 1735) in 2023. Wisk completed first flight of Gen 6 autonomous eVTOL (Dec 2025) — the first FAA type certification candidate for autonomous passenger eVTOL. Joby commercially operational in Dubai (Feb 2026). Dallas is a primary US target market.",
    keyMilestones: ["Wisk Gen 6 autonomous eVTOL first flight (Dec 2025)", "Joby commercially operational in Dubai (Feb 2026)", "TX HB 1735 passed 2023", "DFW vertiport feasibility study complete"],
    lastUpdated: "2026-03-03",
  },
  {
    id: "miami", city: "Miami", metro: "Greater Miami Metro", state: "FL", country: "US",
    lat: 25.7617, lng: -80.1918,
    hasActivePilotProgram: false, hasVertiportZoning: true, vertiportCount: 1,
    activeOperators: ["op_blade", "op_archer"],
    regulatoryPosture: "friendly", hasStateLegislation: true, hasLaancCoverage: true,
    scoreSources: {
      vertiportZoning: { citation: "Miami-Dade County vertiport network feasibility study", date: "2024-07" },
      approvedVertiport: { citation: "Blade Miami helipad — operational for air taxi service", date: "2025-01" },
      activeOperatorPresence: { citation: "Blade Air Mobility operating Miami air taxi routes", date: "2025-01", url: "https://www.blade.com" },
      regulatoryPosture: { citation: "Florida pro-aviation regulatory posture, FDOT supporting AAM", date: "2024-06" },
      stateLegislation: { citation: "Florida Advanced Air Mobility Act signed into law", date: "2024-05" },
      laancCoverage: { citation: "FAA LAANC Authorization active for Miami area airspace", date: "2025-01" },
    },
    notes: "Florida is one of the most UAM-progressive states. Blade Miami now under Joby ownership (acquired Aug 2025). Archer targeting MIA–FLL corridor with United Airlines. Strong tourism demand case — MIA to South Beach and Key Biscayne corridors obvious.",
    keyMilestones: ["Joby acquires Blade's Miami operations (Aug 2025)", "Archer/United MIA–FLL corridor proposed", "FL UAM Act signed", "Miami Dade vertiport network study"],
    lastUpdated: "2026-03-03",
  },
  {
    id: "orlando", city: "Orlando", metro: "Greater Orlando Metro", state: "FL", country: "US",
    lat: 28.5383, lng: -81.3792,
    hasActivePilotProgram: true, hasVertiportZoning: true, vertiportCount: 1,
    activeOperators: [],
    regulatoryPosture: "friendly", hasStateLegislation: true, hasLaancCoverage: true,
    scoreSources: {
      activePilotProgram: { citation: "Lake Nona smart city UAM pilot program active", date: "2024-10" },
      vertiportZoning: { citation: "Orange County vertiport zoning provisions adopted", date: "2024-08" },
      approvedVertiport: { citation: "Lake Nona Vertiport permitted, FDOT-funded feasibility study", date: "2024-11" },
      regulatoryPosture: { citation: "Florida FDOT actively supporting AAM infrastructure", date: "2024-06" },
      stateLegislation: { citation: "Florida Advanced Air Mobility Act applies statewide", date: "2024-05" },
      laancCoverage: { citation: "FAA LAANC Authorization active for Orlando area airspace", date: "2025-01" },
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
    regulatoryPosture: "neutral", hasStateLegislation: false, hasLaancCoverage: true,
    scoreSources: {
      approvedVertiport: { citation: "LVCC Rooftop Vertiport concept approved, design phase", date: "2024-01" },
      regulatoryPosture: { citation: "Nevada has general drone regulation (NV SB 115) but no UAM-specific legislation", date: "2023-06" },
      laancCoverage: { citation: "FAA LAANC Authorization active for Las Vegas airspace", date: "2025-01" },
    },
    notes: "Tourism and convention economy creates premium shuttle demand. Strip to LAS airport is an obvious first corridor. NV SB 115 is a drone regulation update, not UAM-specific. Clark County vertiport overlay zone not verified in public record. NBAA-BACE conference activity is not a sustained pilot program.",
    keyMilestones: ["LVCC vertiport concept in design phase", "NV SB 115 drone regulation (not UAM-specific)"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "phoenix", city: "Phoenix", metro: "Phoenix Metro", state: "AZ", country: "US",
    lat: 33.4484, lng: -112.0740,
    hasActivePilotProgram: true, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", hasStateLegislation: false, hasLaancCoverage: true,
    notes: "Arizona's autonomous vehicle statute (ARS 28-9702) applies to ground vehicles only — no UAM-specific legislation found. Chandler/Tempe testing corridor activity exists but no formal vertiport zoning adopted. Excellent weather for year-round operations.",
    keyMilestones: ["Chandler/Tempe drone testing activity", "AZ has no UAM-specific legislation as of Mar 2026"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "houston", city: "Houston", metro: "Greater Houston Metro", state: "TX", country: "US",
    lat: 29.7604, lng: -95.3698,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "friendly", hasStateLegislation: true, hasLaancCoverage: true,
    notes: "Texas HB 1735 creates statewide favorable environment and TxDOT has active AAM work, but Houston has no local vertiport zoning code adopted. Extreme sprawl and lack of mass transit creates one of the strongest UAM demand cases in the country.",
    keyMilestones: ["TX HB 1735 applies statewide", "No local vertiport zoning adopted", "IAH exploring vertiport feasibility"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "austin", city: "Austin", metro: "Austin Metro", state: "TX", country: "US",
    lat: 30.2672, lng: -97.7431,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "friendly", hasStateLegislation: true, hasLaancCoverage: true,
    notes: "Tech hub culture + Texas legislation = high potential but no local vertiport zoning code adopted. SXSW creates annual demo opportunities. AUS airport actively studying UAM. Strong VC community for early adoption.",
    keyMilestones: ["TX HB 1735 applies", "No local vertiport zoning adopted", "AUS airport mobility study initiated"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "san_diego", city: "San Diego", metro: "San Diego Metro", state: "CA", country: "US",
    lat: 32.7157, lng: -117.1611,
    hasActivePilotProgram: false, hasVertiportZoning: true, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "friendly", hasStateLegislation: true, hasLaancCoverage: true,
    notes: "CA legislation applies. Military/defense presence creates drone testing infrastructure. SAN-LAX corridor is a compelling regional air mobility use case.",
    keyMilestones: ["CA UAM task force active", "Miramar UAM testing discussions reported"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "san_francisco", city: "San Francisco", metro: "SF Bay Area Metro", state: "CA", country: "US",
    lat: 37.7749, lng: -122.4194,
    hasActivePilotProgram: false, hasVertiportZoning: true, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", hasStateLegislation: true, hasLaancCoverage: true,
    notes: "Dense airspace and political headwinds slow progress despite being the tech capital. Strong VC interest. SFO to downtown SF is an obvious corridor once regulations allow.",
    keyMilestones: ["CA UAM task force active", "SFO studying eVTOL integration"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "chicago", city: "Chicago", metro: "Chicagoland Metro", state: "IL", country: "US",
    lat: 41.8781, lng: -87.6298,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: ["op_archer"],
    regulatoryPosture: "neutral", hasStateLegislation: false, hasLaancCoverage: true,
    notes: "Archer targeting Chicago as a launch city with United Airlines partnership. ORD to downtown corridor proposed. Archer completed Abu Dhabi flight test campaign and has NVIDIA/Starlink partnerships accelerating autonomy development. IL regulatory posture still developing.",
    keyMilestones: ["Archer/United O'Hare corridor announced", "Archer Abu Dhabi flight tests completed", "United Airlines investment in Archer confirmed"],
    lastUpdated: "2026-03-03",
  },
  {
    id: "atlanta", city: "Atlanta", metro: "Greater Atlanta Metro", state: "GA", country: "US",
    lat: 33.7490, lng: -84.3880,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", hasStateLegislation: false, hasLaancCoverage: true,
    notes: "World's busiest airport + Delta HQ (Joby investor) creates compelling airline partnership angle. Massive traffic congestion creates strong demand case.",
    keyMilestones: ["Delta invested in Joby Aviation", "ATL long-range plan studying UAM infrastructure"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "nashville", city: "Nashville", metro: "Nashville Metro", state: "TN", country: "US",
    lat: 36.1627, lng: -86.7816,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", hasStateLegislation: false, hasLaancCoverage: true,
    notes: "Rapid population growth and severe traffic congestion creates strong demand signal. BNA expansion plan references future mobility. Strong music/tourism economy for premium services.",
    keyMilestones: ["Nashville 2040 plan references UAM", "BNA expansion includes future mobility study"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "charlotte", city: "Charlotte", metro: "Charlotte Metro", state: "NC", country: "US",
    lat: 35.2271, lng: -80.8431,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", hasStateLegislation: false, hasLaancCoverage: true,
    notes: "CLT is a major US hub. Dense banking/finance HQs create executive shuttle demand. Fastest-growing major city in Southeast creates infrastructure urgency.",
    keyMilestones: ["CLT airport long-range plan references UAM", "Charlotte Future Mobility Task Force formed"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "denver", city: "Denver", metro: "Denver Metro", state: "CO", country: "US",
    lat: 39.7392, lng: -104.9903,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", hasStateLegislation: false, hasLaancCoverage: true,
    notes: "Mountain resort corridors (Denver to Vail/Aspen/Breckenridge) represent a compelling regional air mobility use case unlike any other US market.",
    keyMilestones: ["DEN airport studying future mobility infrastructure", "CO aerospace corridor designation"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "seattle", city: "Seattle", metro: "Seattle–Tacoma Metro", state: "WA", country: "US",
    lat: 47.6062, lng: -122.3321,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", hasStateLegislation: false, hasLaancCoverage: true,
    notes: "Boeing and Amazon presence creates a unique innovation ecosystem. Puget Sound water crossing corridors are a compelling geographic opportunity not available elsewhere.",
    keyMilestones: ["Amazon Prime Air BVLOS ops nearby", "Boeing invested in multiple eVTOL companies"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "boston", city: "Boston", metro: "Greater Boston Metro", state: "MA", country: "US",
    lat: 42.3601, lng: -71.0589,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", hasStateLegislation: false, hasLaancCoverage: true,
    notes: "Logan to downtown harbor crossing is a natural first route — currently takes 45+ min by car. MIT/Harvard research ecosystem. MassPort exploring UAM at Logan.",
    keyMilestones: ["MassPort studying UAM integration at Logan", "MIT UAM research lab established"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "minneapolis", city: "Minneapolis", metro: "Twin Cities Metro", state: "MN", country: "US",
    lat: 44.9778, lng: -93.2650,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "neutral", hasStateLegislation: false, hasLaancCoverage: true,
    notes: "Cold weather testing ground — any operator validated here works everywhere. MSP is a major Delta hub. Twin Cities sprawl creates transit gaps UAM could address.",
    keyMilestones: ["University of MN UAM research program active"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "washington_dc", city: "Washington D.C.", metro: "DC Metro", state: "DC", country: "US",
    lat: 38.9072, lng: -77.0369,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "restrictive", hasStateLegislation: false, hasLaancCoverage: false,
    notes: "Heavily restricted airspace (SFRA) around DC makes UAM operations extremely challenging in the near term. FAA is studying potential exceptions but timeline unclear.",
    keyMilestones: ["FAA studying SFRA exceptions for eVTOL", "DCA/IAD corridor study initiated"],
    lastUpdated: "2025-02-01",
  },
  {
    id: "columbus", city: "Columbus", metro: "Columbus Metro", state: "OH", country: "US",
    lat: 39.9612, lng: -82.9988,
    hasActivePilotProgram: false, hasVertiportZoning: false, vertiportCount: 0,
    activeOperators: [],
    regulatoryPosture: "friendly", hasStateLegislation: false, hasLaancCoverage: true,
    scoreSources: {
      regulatoryPosture: { citation: "ODOT created dedicated AAM Division (Mar 2025); DriveOhio published nation's first state AAM framework", date: "2025-03", url: "https://www.urbanairmobilitynews.com/uam-infrastructure/ohio-publishes-advanced-air-mobility-framework/" },
      laancCoverage: { citation: "FAA LAANC active for Columbus area airspace (CMH Class C, Rickenbacker LCK)", date: "2025-01" },
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

    // Group overrides by city
    const overridesByCity = new Map<string, Record<string, unknown>>();
    for (const override of overrides) {
      const existing = overridesByCity.get(override.cityId) ?? {};
      existing[override.field] = override.value;
      overridesByCity.set(override.cityId, existing);
    }

    // Rebuild cities with overrides merged
    const cities = RAW_CITIES.map((city) => {
      const cityOverrides = overridesByCity.get(city.id);
      const merged = cityOverrides ? { ...city, ...cityOverrides } : city;
      const { score, breakdown } = calculateReadinessScore(merged as City);
      return { ...merged, score, breakdown } as City;
    }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

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
