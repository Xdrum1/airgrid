/**
 * Shared light-theme design tokens for the AirIndex marketing surface.
 *
 * Every marketing page imports from here so typography, color, and
 * spacing stay consistent. Dashboard / admin / city / corridor /
 * operator / feed continue to use their existing dark styling —
 * this file is for public-facing marketing only.
 */

export const LT = {
  // Backgrounds
  bg: "#ffffff",
  subtleBg: "#f6f9fc",
  panelBg: "#f9fbfd",

  // Text
  textPrimary: "#0a2540",
  textSecondary: "#425466",
  textTertiary: "#697386",
  textInverse: "#ffffff",

  // Accents
  accent: "#5B8DB8",        // brand blue
  accentDeep: "#0a4068",
  accentSoft: "#e0ecf5",

  // Palette (for per-section or per-persona accents)
  mint: "#2dd4bf",
  mintDeep: "#0d9488",
  amber: "#f59e0b",
  amberDeep: "#b45309",
  coral: "#f97316",
  lavender: "#a78bfa",
  navy: "#0a2540",

  // Borders + dividers
  cardBorder: "#e3e8ee",
  divider: "rgba(10,37,64,0.08)",

  // Shadows
  shadowSm: "0 1px 2px rgba(10,37,64,0.04)",
  shadowMd: "0 4px 12px rgba(10,37,64,0.06)",
  shadowLg: "0 16px 40px rgba(10,37,64,0.08), 0 4px 12px rgba(10,37,64,0.04)",

  // Typography
  fontBody: "'Inter', sans-serif",
  fontDisplay: "'Space Grotesk', sans-serif",
  fontMono: "'Space Mono', monospace",
};

// ─────────────────────────────────────────────────────────
// Reusable inline-style snippets
// ─────────────────────────────────────────────────────────

export const pageShell: React.CSSProperties = {
  minHeight: "100vh",
  background: LT.bg,
  color: LT.textPrimary,
  fontFamily: LT.fontBody,
};

export const mainContainer: React.CSSProperties = {
  maxWidth: 1120,
  margin: "0 auto",
  padding: "clamp(48px, 7vw, 96px) 24px",
};

export const narrowContainer: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "clamp(48px, 7vw, 96px) 24px",
};

export const eyebrow: React.CSSProperties = {
  fontFamily: LT.fontMono,
  fontSize: 11,
  letterSpacing: "0.14em",
  color: LT.accent,
  marginBottom: 16,
  textTransform: "uppercase",
};

export const h1Display: React.CSSProperties = {
  fontFamily: LT.fontDisplay,
  fontWeight: 700,
  fontSize: "clamp(32px, 4.6vw, 52px)",
  lineHeight: 1.1,
  letterSpacing: "-0.02em",
  color: LT.textPrimary,
  margin: "0 0 18px",
};

export const h2Display: React.CSSProperties = {
  fontFamily: LT.fontDisplay,
  fontWeight: 700,
  fontSize: "clamp(26px, 3.4vw, 38px)",
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
  color: LT.textPrimary,
  margin: "0 0 14px",
};

export const h3Display: React.CSSProperties = {
  fontFamily: LT.fontDisplay,
  fontWeight: 700,
  fontSize: 20,
  lineHeight: 1.3,
  letterSpacing: "-0.01em",
  color: LT.textPrimary,
  margin: "0 0 10px",
};

export const bodyLead: React.CSSProperties = {
  color: LT.textSecondary,
  fontSize: "clamp(15px, 1.4vw, 17px)",
  lineHeight: 1.65,
  margin: "0 0 24px",
};

export const bodyText: React.CSSProperties = {
  color: LT.textSecondary,
  fontSize: 15,
  lineHeight: 1.7,
  margin: "0 0 16px",
};

export const mutedText: React.CSSProperties = {
  color: LT.textTertiary,
  fontSize: 13,
  lineHeight: 1.65,
};

export const ctaPrimary: React.CSSProperties = {
  display: "inline-block",
  padding: "14px 28px",
  background: LT.textPrimary,
  color: LT.textInverse,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.01em",
  textDecoration: "none",
  borderRadius: 8,
};

export const ctaSecondary: React.CSSProperties = {
  display: "inline-block",
  padding: "14px 28px",
  border: `1px solid ${LT.cardBorder}`,
  color: LT.textPrimary,
  fontSize: 14,
  fontWeight: 600,
  textDecoration: "none",
  borderRadius: 8,
  background: LT.bg,
};

export const card: React.CSSProperties = {
  background: LT.bg,
  border: `1px solid ${LT.cardBorder}`,
  borderRadius: 12,
  padding: "24px 26px",
  boxShadow: LT.shadowSm,
};

export const sectionTag = (color: string = LT.accent): React.CSSProperties => ({
  fontFamily: LT.fontMono,
  fontSize: 10,
  letterSpacing: "0.14em",
  color,
  textTransform: "uppercase",
  marginBottom: 10,
});
