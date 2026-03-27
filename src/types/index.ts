// ============================================================
// AIRINDEX — Core Types
// ============================================================

export type RegulatoryPosture = "friendly" | "neutral" | "restrictive" | "unknown";

export type LegislationStatus = "enacted" | "actively_moving" | "none";

export type WeatherInfraLevel = "full" | "partial" | "none";

export type OperatorType =
  | "evtol_manufacturer"
  | "air_taxi_service"
  | "drone_delivery"
  | "cargo";

export type VertiportStatus =
  | "planned"
  | "permitted"
  | "under_construction"
  | "operational";

export type CorridorStatus =
  | "proposed"
  | "authorized"
  | "active"
  | "suspended";

export type ChangeType =
  | "new_filing"
  | "status_change"
  | "new_law"
  | "faa_update"
  | "score_change"
  | "watch_change";

// --- Score Breakdown ---
export interface ScoreBreakdown {
  activePilotProgram: number;
  vertiportZoning: number;
  approvedVertiport: number;
  activeOperatorPresence: number;
  regulatoryPosture: number;
  stateLegislation: number;
  weatherInfrastructure: number;
}

// --- City / Market ---
export interface City {
  id: string;
  city: string;
  metro: string;  // e.g. "Greater Los Angeles Metro"
  state: string;
  country: string;
  lat: number;
  lng: number;

  // Scoring inputs
  hasActivePilotProgram: boolean;
  hasVertiportZoning: boolean;
  vertiportCount: number;
  activeOperators: string[];           // Operator IDs
  regulatoryPosture: RegulatoryPosture;
  stateLegislationStatus: LegislationStatus;
  weatherInfraLevel: WeatherInfraLevel;

  // Heliport infrastructure (FAA 5010)
  heliportCount?: number;       // total heliports in metro
  heliportPublicCount?: number; // public-use heliports in metro

  // Computed
  score?: number;
  breakdown?: ScoreBreakdown;

  // Source citations per scoring factor
  scoreSources?: Partial<Record<keyof ScoreBreakdown, {
    citation: string;
    date: string;          // "YYYY-MM" verification date
    url?: string;
  }>>;

  // Sub-indicator diagnostic data (gap analysis engine)
  subIndicators?: Partial<Record<keyof ScoreBreakdown, SubIndicator[]>>;

  // Content
  notes: string;
  keyMilestones: string[];
  lastUpdated: string;                 // ISO date string
}

// --- Operator ---
export interface Operator {
  id: string;
  name: string;
  type: OperatorType;
  hq: string;
  faaCertStatus: "operational" | "in_progress" | "pending" | "n/a";
  aircraft: string[];
  funding: string;
  keyPartnerships: string[];
  acquisitions?: string[];             // Notable acquisitions
  activeMarkets: string[];             // City IDs
  status?: "active" | "acquired";      // Acquired = folded into parent company
  color: string;                       // UI accent color
  website?: string;
  lastUpdated: string;
}

// --- Vertiport ---
export interface Vertiport {
  id: string;
  name: string;
  operatorId?: string;
  status: VertiportStatus;
  cityId: string;
  lat: number;
  lng: number;
  siteType: "rooftop" | "ground" | "airport_adjacent" | "transit_hub";
  padCount?: number;
  chargingCapable: boolean;
  permitFilingDate?: string;
  expectedOpenDate?: string;
  sourceUrl?: string;
  lastUpdated: string;
}

// --- Corridor ---
export interface Corridor {
  id: string;
  name: string;
  status: CorridorStatus;
  cityId: string;
  operatorId?: string;
  startPoint: { lat: number; lng: number; label: string };
  endPoint: { lat: number; lng: number; label: string };
  waypoints?: { lat: number; lng: number }[];
  distanceKm: number;
  estimatedFlightMinutes: number;
  maxAltitudeFt: number;
  altitudeMinFt?: number;
  faaAuthNumber?: string;
  effectiveDate?: string;
  expirationDate?: string;
  clearedOperators?: string[];
  notes?: string;
  sourceUrl?: string;
  lastUpdated: string;
}

// --- Regulatory Filing ---
export interface RegulatoryFiling {
  id: string;
  filingType:
    | "vertiport_zoning"
    | "corridor_authorization"
    | "noise_ordinance"
    | "airspace_waiver"
    | "state_bill";
  jurisdictionLevel: "federal" | "state" | "city";
  jurisdictionName: string;
  status: "filed" | "under_review" | "approved" | "denied" | "appealed";
  filingDate: string;
  decisionDate?: string;
  relatedOperatorId?: string;
  relatedVertiportId?: string;
  summary: string;
  sourceUrl?: string;
  lastUpdated: string;
}

// --- Changelog Entry ---
export interface ChangelogEntry {
  id: string;
  changeType: ChangeType;
  relatedEntityType: "city" | "vertiport" | "operator" | "corridor" | "filing";
  relatedEntityId: string;
  summary: string;
  timestamp: string;
  sourceUrl?: string;
}

// --- Alert Subscription ---
export interface AlertSubscription {
  id: string;
  email: string;
  cityIds: string[];                   // Empty = all cities
  corridorIds: string[];               // Empty = no corridor alerts
  changeTypes: ChangeType[];          // Empty = all change types
  createdAt: string;
}

// --- Sub-Indicator (Gap Analysis) ---
export type SubIndicatorStatus = "achieved" | "partial" | "missing" | "unknown";

export interface SubIndicator {
  id: string;
  label: string;
  status: SubIndicatorStatus;
  citation?: string;
  citationDate?: string;
  citationUrl?: string;
  peerNote?: string; // populated at runtime by peer comparison
}

// --- API Response wrappers ---
export interface ApiResponse<T> {
  data: T;
  lastUpdated: string;
  source: string;
}
