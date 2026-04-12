/**
 * FDOT Advanced Air Mobility Business Plan — Florida's Aerial Highway Network
 * Source: FDOT, November 2025
 * PDF: https://fdotwww.blob.core.windows.net/sitefinity/docs/default-source/aviation/aam/fdot-aam-business-plan-_nov_2025_final.pdf
 *
 * Extracted data:
 *   - 18 airports with published AAM plans
 *   - 4-phase aerial network with ~40 airports
 *   - SunTrax AAM HQ phasing
 *   - Vertiport suitability screening results (30 sites in Tampa/Orlando)
 *   - Space and power requirements
 *   - Demand forecasts
 */

// ── Airports with Published AAM Plans ──
// These 18 airports have publicly expressed plans of adding AAM (p6)
export interface FdotAamAirport {
  code: string;
  name: string;
  city: string;
  /** Nearest AirIndex tracked market, if any */
  marketId?: string;
  /** Which network phases include this airport */
  phases: string[];
  lat: number;
  lng: number;
}

export const FDOT_AAM_AIRPORTS: FdotAamAirport[] = [
  // 18 airports with published AAM plans
  { code: "BCT", name: "Boca Raton Airport", city: "Boca Raton", marketId: "miami", phases: ["1B"], lat: 26.3785, lng: -80.1077 },
  { code: "DAB", name: "Daytona Beach International Airport", city: "Daytona Beach", phases: ["1A"], lat: 29.1799, lng: -81.0581 },
  { code: "FLL", name: "Fort Lauderdale/Hollywood International Airport", city: "Fort Lauderdale", marketId: "miami", phases: ["1B"], lat: 26.0726, lng: -80.1527 },
  { code: "LAL", name: "Lakeland Linder International Airport", city: "Lakeland", marketId: "orlando", phases: ["1A"], lat: 27.9889, lng: -82.0186 },
  { code: "TMB", name: "Miami Executive Airport", city: "Miami", marketId: "miami", phases: ["1B"], lat: 25.6479, lng: -80.4328 },
  { code: "MIA", name: "Miami International Airport", city: "Miami", marketId: "miami", phases: ["1B"], lat: 25.7959, lng: -80.2870 },
  { code: "OPF", name: "Miami-Opa Locka Executive Airport", city: "Opa-locka", marketId: "miami", phases: ["1B"], lat: 25.9070, lng: -80.2784 },
  { code: "ORL", name: "Orlando Executive Airport", city: "Orlando", marketId: "orlando", phases: ["1A"], lat: 28.5455, lng: -81.3329 },
  { code: "MCO", name: "Orlando International Airport", city: "Orlando", marketId: "orlando", phases: ["1A"], lat: 28.4312, lng: -81.3081 },
  { code: "PBI", name: "Palm Beach International Airport", city: "West Palm Beach", marketId: "miami", phases: ["1B"], lat: 26.6832, lng: -80.0956 },
  { code: "TPF", name: "Peter O Knight Airport", city: "Tampa", marketId: "tampa", phases: ["1A"], lat: 27.9155, lng: -82.4493 },
  { code: "SEF", name: "Sebring Regional Airport", city: "Sebring", phases: ["1A"], lat: 27.4564, lng: -81.3424 },
  { code: "TLH", name: "Tallahassee International Airport", city: "Tallahassee", phases: ["1D", "2D"], lat: 30.3965, lng: -84.3503 },
  { code: "TPA", name: "Tampa International Airport", city: "Tampa", marketId: "tampa", phases: ["1A"], lat: 27.9755, lng: -82.5332 },
  { code: "VRB", name: "Vero Beach Regional Airport", city: "Vero Beach", phases: ["1B"], lat: 27.6556, lng: -80.4179 },
  // Additional Phase 1A airports not in the top-18 but on the network map
  { code: "SRQ", name: "Sarasota Bradenton International Airport", city: "Sarasota", phases: ["1A"], lat: 27.3954, lng: -82.5543 },
  { code: "PIE", name: "St. Pete-Clearwater International Airport", city: "St. Petersburg", marketId: "tampa", phases: ["1A"], lat: 27.9115, lng: -82.6874 },
  { code: "ISM", name: "Kissimmee Gateway Airport", city: "Kissimmee", marketId: "orlando", phases: ["1A"], lat: 28.2898, lng: -81.4371 },
  { code: "MLB", name: "Melbourne Orlando International Airport", city: "Melbourne", phases: ["1A"], lat: 28.1028, lng: -80.6453 },
  { code: "SFB", name: "Orlando Sanford International Airport", city: "Sanford", marketId: "orlando", phases: ["1A"], lat: 28.7776, lng: -81.2375 },
  { code: "TIX", name: "Space Coast Regional Airport", city: "Titusville", phases: ["1A"], lat: 28.5148, lng: -80.7992 },
  // Phase 1B additional
  { code: "FPR", name: "Treasure Coast International Airport", city: "Fort Pierce", phases: ["1B"], lat: 27.4951, lng: -80.3683 },
  { code: "SUA", name: "Witham Field Airport", city: "Stuart", phases: ["1B"], lat: 27.1817, lng: -80.2211 },
  // Phase 1C
  { code: "RSW", name: "Southwest Florida International Airport", city: "Fort Myers", phases: ["1C"], lat: 26.5362, lng: -81.7552 },
  { code: "APF", name: "Naples Municipal Airport", city: "Naples", phases: ["1C"], lat: 26.1526, lng: -81.7753 },
  { code: "HST", name: "Homestead ARB", city: "Homestead", marketId: "miami", phases: ["1C"], lat: 25.4886, lng: -80.3836 },
  { code: "MTH", name: "Florida Keys Marathon International Airport", city: "Marathon", phases: ["1C"], lat: 24.7261, lng: -81.0514 },
  { code: "EYW", name: "Key West International Airport", city: "Key West", phases: ["1C"], lat: 24.5561, lng: -81.7596 },
  // Phase 1D
  { code: "PNS", name: "Pensacola International Airport", city: "Pensacola", phases: ["1D"], lat: 30.4734, lng: -87.1866 },
  // Phase 2A
  { code: "UST", name: "Northeast Florida Regional Airport", city: "St. Augustine", phases: ["2A"], lat: 29.9592, lng: -81.3397 },
  { code: "JAX", name: "Jacksonville International Airport", city: "Jacksonville", phases: ["2A", "2D"], lat: 30.4941, lng: -81.6879 },
  // Phase 2C
  { code: "GNV", name: "Gainesville Regional Airport", city: "Gainesville", phases: ["2C"], lat: 29.6900, lng: -82.2718 },
  { code: "LCQ", name: "Lake City Gateway Airport", city: "Lake City", phases: ["2C"], lat: 30.1819, lng: -82.5769 },
];

// ── Network Phases ──
export interface FdotNetworkPhase {
  id: string;
  name: string;
  description: string;
  cities: string[];
  airportCodes: string[];
  /** AirIndex tracked markets touched by this phase */
  marketIds: string[];
}

export const FDOT_NETWORK_PHASES: FdotNetworkPhase[] = [
  {
    id: "1A",
    name: "Central Florida I-4 Corridor",
    description: "First phase of AAM deployment. High travel demand between Tampa and Orlando. SunTrax AAM HQ is the anchor.",
    cities: ["Sarasota", "St. Petersburg", "Clearwater", "Tampa", "Lakeland", "Auburndale", "Sebring", "Kissimmee", "Orlando", "Cocoa", "Melbourne", "Daytona Beach"],
    airportCodes: ["SRQ", "PIE", "TPA", "TPF", "LAL", "SEF", "ISM", "MCO", "ORL", "SFB", "TIX", "MLB", "DAB"],
    marketIds: ["tampa", "orlando"],
  },
  {
    id: "1B",
    name: "Port St. Lucie to Miami",
    description: "East coast corridor connecting South Florida metros. Includes all Miami-area airports.",
    cities: ["Port St. Lucie", "Stuart", "West Palm Beach", "Boca Raton", "Fort Lauderdale", "Miami-Opa Locka", "Miami"],
    airportCodes: ["FPR", "SUA", "PBI", "BCT", "FLL", "OPF", "MIA", "TMB"],
    marketIds: ["miami"],
  },
  {
    id: "1C",
    name: "Tampa to Naples / Miami to Key West",
    description: "Gulf coast and Keys extensions from Phase 1A/1B anchors.",
    cities: ["Fort Myers", "Naples", "Homestead", "Marathon", "Key West"],
    airportCodes: ["RSW", "APF", "HST", "MTH", "EYW"],
    marketIds: ["miami"],
  },
  {
    id: "1D",
    name: "Pensacola to Tallahassee",
    description: "Panhandle corridor connecting state capital to northwest Florida.",
    cities: ["Pensacola", "Tallahassee"],
    airportCodes: ["PNS", "TLH"],
    marketIds: [],
  },
  {
    id: "2A",
    name: "Daytona Beach to Jacksonville",
    description: "Northeast Florida extension from Phase 1A.",
    cities: ["St. Augustine", "Jacksonville"],
    airportCodes: ["UST", "JAX"],
    marketIds: [],
  },
  {
    id: "2B",
    name: "Sebring Out East and West",
    description: "Lateral expansion from Sebring hub.",
    cities: [],
    airportCodes: [],
    marketIds: [],
  },
  {
    id: "2C",
    name: "Orlando to Lake City / Tampa to Tallahassee",
    description: "North-central Florida expansion connecting I-4 corridor to north Florida.",
    cities: ["Gainesville", "Lake City", "Inverness", "Williston", "Cross City", "Perry"],
    airportCodes: ["GNV", "LCQ"],
    marketIds: [],
  },
  {
    id: "2D",
    name: "Jacksonville to Tallahassee",
    description: "Northern corridor connecting northeast to northwest Florida.",
    cities: [],
    airportCodes: ["JAX", "TLH"],
    marketIds: [],
  },
];

// ── Vertiport Suitability Screening Results ──
// From pp17-18: 239,000 parcels screened in I-4 Tampa-Orlando corridor
export interface FdotSuitabilityScreening {
  region: string;
  totalParcelsScreened: number;
  potentialSites: number;
  mroSites: number;
  passengerSites: number;
  dualUseSites: number;
  /** AirIndex tracked market */
  marketId: string;
}

export const FDOT_SUITABILITY_RESULTS: FdotSuitabilityScreening[] = [
  {
    region: "Tampa",
    totalParcelsScreened: 239000, // shared pool
    potentialSites: 15,
    mroSites: 4, // estimated from 9 total MRO split
    passengerSites: 8, // estimated from 16 total passenger split
    dualUseSites: 3, // estimated from 5 total dual-use split
    marketId: "tampa",
  },
  {
    region: "Orlando",
    totalParcelsScreened: 239000, // shared pool
    potentialSites: 15,
    mroSites: 5,
    passengerSites: 8,
    dualUseSites: 2,
    marketId: "orlando",
  },
];

// ── Suitability Criteria ──
// The multi-criteria framework used for the 239K parcel screening
export const FDOT_SUITABILITY_CRITERIA = {
  airspace: [
    "Airspace classification",
    "Regulatory constraints",
    "Proximity to controlled airspace (Class B, D, E)",
    "Presence of runway protection zones and instrument approach paths",
    "Obstacle identification surfaces",
    "Terminal instrument procedures",
    "Operational complexity and coordination requirements",
    "Conflicts with commercial traffic",
    "Military and restricted airspace boundaries",
  ],
  landside: [
    "Land use and zoning",
    "Utility infrastructure assessment",
    "Noise and environmental constraints",
    "Emergency response and safety",
    "Parcel size",
    "Logistics and supplies",
  ],
  mroSpecific: [
    "Industrial zoning compatibility",
    "Proximity to logistics hubs",
    "Access to existing aviation infrastructure",
  ],
  passengerSpecific: [
    "Multimodal connectivity",
    "Access to high-demand corridors",
    "User convenience and emergency response readiness",
    "Operational adaptability",
  ],
  airspaceZones: {
    green: "Preferred Zones — highly suitable with minimal regulatory/operational constraints",
    yellow: "Class D and E Airspace — moderately constrained, suitable with planning/coordination",
    orange: "Class B Airspace 2,000-10,000 ft — significant constraints, requires mitigation/special procedures",
    pink: "Class B Airspace Surface to 1,600 ft — highly controlled surface-level near major airports, requires FAA/airport authority approval",
    red: "Obstruction ID Surface — high-risk/prohibited areas due to regulatory restrictions",
  },
} as const;

// ── SunTrax AAM Headquarters ──
export const SUNTRAX = {
  name: "SunTrax Air",
  location: "I-4 corridor between Tampa and Orlando International Airports",
  lat: 28.1567, // approximate — between Tampa and Orlando
  lng: -81.7200,
  website: "https://suntraxfl.com/suntrax-air/",
  description: "Florida's AAM Headquarters — dedicated to testing advanced transportation technologies including eVTOL aircraft, low-altitude flight, and vertiport operations.",
  phases: [
    {
      id: "1A",
      description: "Single at-grade vertiport with ancillary support facilities, entry driveway and parking lot. VFR daytime and nighttime operations. UH-60 Blackhawk design aircraft.",
      constructionStart: "2025-09",
      constructionEnd: "2025-10",
      vertiports: 1,
      chargingPositions: 0,
    },
    {
      id: "1B",
      description: "South/north roundabouts, access road with vehicle staging, 1 eVTOL parking/charging station, 1 at-grade vertiport, 1 maintenance hangar (20,000 sq ft). Emergency vehicle staging area.",
      constructionStart: "2026-01",
      constructionEnd: "2026-02",
      vertiports: 1,
      chargingPositions: 1,
    },
    {
      id: "2A",
      description: "Third vertiport, aerial test track over western edge of campus. 6 charging/parking positions, 3 maintenance hangars, taxiways/aprons/utilities. Disaster response staging.",
      vertiports: 1,
      chargingPositions: 7,
    },
    {
      id: "2B",
      description: "At-grade vertiport, 3,000-foot landing strip, 6 maintenance hangars, 6 additional charging positions, 1 more at-grade vertiport.",
      vertiports: 2,
      chargingPositions: 7,
    },
    {
      id: "3",
      description: "Commercial operations. Four-story R&D and classroom building with rooftop vertiport. Passenger lounge with vertiport view. Parking, utilities, access roadway.",
      vertiports: 1,
      chargingPositions: 0,
    },
  ],
  totalVertiportsAtBuildout: 6,
  constructionTimeline: {
    phase1Complete: "2026-12",
    phase2_3: "2027-2028",
  },
} as const;

// ── Vertiport Space Requirements (p20) ──
export const VERTIPORT_SPACE_REQUIREMENTS = {
  note: "For a 4-eVTOL-space vertiport. Source: FDOT AAM Business Plan p20.",
  airside: {
    tlof: { acres: 0.35, description: "Take-off and Landing Area" },
    evtolParking: { acres: 0.4, description: "eVTOL Parking (per space)" },
    hangar: { acres: 0.5, description: "Hangar/Maintenance Facility" },
    support: { acres: 0.5, description: "Support Equipment (weather, comms, lighting, fire safety, chargers)" },
  },
  landside: {
    passenger: { acres: 0.1, description: "Passenger Facilities" },
    vehicleParking: { acres: 0.25, description: "Vehicle Parking" },
  },
  totalAcres: 3.3,
} as const;

// ── Power Requirements (p21) ──
export const VERTIPORT_POWER_REQUIREMENTS = {
  note: "Assumed requirements for a 2-charger vertiport. Source: FDOT AAM Business Plan p21.",
  totalPeakPowerKw: 1223,
  airside: {
    lighting: 3,
    supportVehicleChargersLevel2: 30,
    supportVehicleChargersDcfc: 132,
    evtolChargers2Simultaneous: 700,
  },
  landside: {
    lighting: 5,
    hvac: 10,
    buildingLoad: 10,
    carChargersLevel2: 135,
    carChargersDcfc: 198,
  },
} as const;

// ── Demand Forecasts (pp37-38) ──
export const FDOT_DEMAND_FORECASTS = {
  note: "Florida Turnpike Statewide Model projections for Phase 1A counties. Source: FDOT AAM Business Plan pp37-38.",
  annualPassengerTrips: {
    2027: {
      business: 33_600_000,
      tourismLeisure: 172_000_000,
      commute: 204_000_000,
      total: 411_000_000,
    },
    2050: {
      business: 128_000_000,
      tourismLeisure: 552_000_000,
      commute: 591_000_000,
      total: 1_272_000_000,
    },
  },
  growth: {
    business: "281%",
    tourismLeisure: "219%",
    commute: "189%",
    total: "209%",
  },
  freightTonnage: {
    2027: "97-158 tons",
    2050: "10,500-16,800 tons",
  },
  passengerVolume: {
    2027: "220,000 to 1.4 million",
    2050: "11 million to 18.7 million annually",
  },
} as const;

// ── Stakeholder Engagement Timeline (p34) ──
export const FDOT_IMPLEMENTATION_PHASES = [
  {
    phase: 1,
    name: "Market Consultation",
    timing: "Fall 2025",
    goal: "Build/discuss Concept of Operations (ConOps), network, use cases, locations",
  },
  {
    phase: 2,
    name: "Establish SunTrax Air",
    timing: "Early 2026",
    goal: "Operationalize AAM R&D at SunTrax",
  },
  {
    phase: 3,
    name: "System Kickoff",
    timing: "Late 2026",
    goal: "Educate the public to build trust",
  },
  {
    phase: 4,
    name: "Full Deployment",
    timing: "Beyond 2026",
    goal: "Expand and calibrate program and system",
  },
] as const;

// ── Helper: get airports for a market ──
export function getFdotAirportsForMarket(marketId: string): FdotAamAirport[] {
  return FDOT_AAM_AIRPORTS.filter((a) => a.marketId === marketId);
}

// ── Helper: get phases touching a market ──
export function getFdotPhasesForMarket(marketId: string): FdotNetworkPhase[] {
  return FDOT_NETWORK_PHASES.filter((p) => p.marketIds.includes(marketId));
}

// ── Helper: get screening results for a market ──
export function getFdotScreeningForMarket(marketId: string): FdotSuitabilityScreening | undefined {
  return FDOT_SUITABILITY_RESULTS.find((s) => s.marketId === marketId);
}
