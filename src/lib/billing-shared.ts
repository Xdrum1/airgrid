// Client-safe billing helpers — no server-only imports (prisma, auth, env)

/** Returns true for any paid tier (Alert+) */
export function hasAlertAccess(tier: string): boolean {
  return ["alert", "pro", "institutional", "enterprise", "grandfathered"].includes(tier);
}

/** Returns true for tiers with Pro-level access */
export function hasProAccess(tier: string): boolean {
  return ["pro", "institutional", "enterprise", "grandfathered"].includes(tier);
}

/** Returns true for tiers with Institutional-level access */
export function hasInstitutionalAccess(tier: string): boolean {
  return ["institutional", "enterprise"].includes(tier);
}

/** Max monitored markets for Alert tier (null = unlimited) */
export function getWatchlistLimit(tier: string): number | null {
  if (tier === "alert") return 3;
  return null; // Pro+, grandfathered, and free all unlimited
}
