// Client-safe billing helpers — no server-only imports (prisma, auth, env)

/** Returns true for tiers with Pro-level access */
export function hasProAccess(tier: string): boolean {
  return ["pro", "institutional", "enterprise", "grandfathered"].includes(tier);
}

/** Returns true for tiers with Institutional-level access */
export function hasInstitutionalAccess(tier: string): boolean {
  return ["institutional", "enterprise"].includes(tier);
}
