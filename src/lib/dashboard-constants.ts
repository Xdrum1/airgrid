// -------------------------------------------------------
// Shared constants & helpers used by Dashboard + CityDetail + AdminReview
// -------------------------------------------------------

export const VERTIPORT_STATUS_COLORS: Record<string, string> = {
  planned: "#f59e0b",
  permitted: "#5B8DB8",
  under_construction: "#7c3aed",
  operational: "#00ff88",
};

export const CORRIDOR_STATUS_COLORS: Record<string, string> = {
  proposed: "#f59e0b",
  authorized: "#5B8DB8",
  active: "#00ff88",
  suspended: "#ff4444",
};

export const CHANGE_TYPE_COLORS: Record<string, string> = {
  new_filing: "#5B8DB8",
  status_change: "#f59e0b",
  new_law: "#00ff88",
  faa_update: "#7c3aed",
  watch_change: "#e879f9",
};

export const WATCH_STATUS_COLORS: Record<string, string> = {
  STABLE: "#00ff88",
  POSITIVE_WATCH: "#5B8DB8",
  NEGATIVE_WATCH: "#f59e0b",
  DEVELOPING: "#7c3aed",
};

export const OUTLOOK_COLORS: Record<string, string> = {
  IMPROVING: "#00ff88",
  STABLE: "#888",
  DETERIORATING: "#ff4444",
};

export const WATCH_STATUS_LABELS: Record<string, string> = {
  STABLE: "Stable",
  POSITIVE_WATCH: "Positive Watch",
  NEGATIVE_WATCH: "Negative Watch",
  DEVELOPING: "Developing",
};

export const OUTLOOK_LABELS: Record<string, string> = {
  IMPROVING: "Improving",
  STABLE: "Stable",
  DETERIORATING: "Deteriorating",
};

export const FEED_CATEGORY_COLORS: Record<string, string> = {
  Regulatory: "#5B8DB8",
  Infrastructure: "#7c3aed",
  Operator: "#f59e0b",
  Legislative: "#00ff88",
};

export const FEED_STATUS_COLORS: Record<string, string> = {
  draft: "#f59e0b",
  published: "#00ff88",
  archived: "#555",
};

export const SCORE_COMPONENT_COLORS: Record<string, string> = {
  activePilotProgram: "#00ff88",
  approvedVertiport: "#5B8DB8",
  activeOperatorPresence: "#f59e0b",
  vertiportZoning: "#7c3aed",
  regulatoryPosture: "#ff6b35",
  stateLegislation: "#ff4444",
  weatherInfrastructure: "#10b981",
};

export const SCORE_COMPONENT_LABELS: Record<string, string> = {
  activePilotProgram: "Pilot Program",
  approvedVertiport: "Vertiport",
  activeOperatorPresence: "Operators",
  vertiportZoning: "Zoning",
  regulatoryPosture: "Regulatory",
  stateLegislation: "Legislation",
  weatherInfrastructure: "Weather",
};

export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  // Older than 30 days — show absolute date
  const d = new Date(timestamp);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const currentYear = new Date().getFullYear();
  if (d.getFullYear() === currentYear) return `${months[d.getMonth()]} ${d.getDate()}`;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
