// ============================================================
// AIRGRID — Core Types
// ============================================================

export type RegulatoryPosture = "friendly" | "neutral" | "restrictive" | "unknown";

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
  | "faa_update";

// --- Score Breakdown ---
export interface ScoreBreakdown {
  activePilotProgram: number;
  vertiportZoning: number;
  approvedVertiport: number;
  activeOperatorPresence: number;
  regulatoryPosture: number;
  stateLegislation: number;
  laancCoverage: number;
}

// --- City / Market ---
export interface City {
  id: string;
  city: string;
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
  hasStateLegislation: boolean;
  hasLaancCoverage: boolean;

  // Computed
  score?: number;
  breakdown?: ScoreBreakdown;

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
  activeMarkets: string[];             // City IDs
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
  changeTypes: ChangeType[];          // Empty = all change types
  createdAt: string;
}

// --- API Response wrappers ---
export interface ApiResponse<T> {
  data: T;
  lastUpdated: string;
  source: string;
}
