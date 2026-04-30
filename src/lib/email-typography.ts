/**
 * Email typography standard for AirIndex publications.
 *
 * Matches the Pulse #7 typography (Apr 24 2026) which was the first issue
 * tuned for older-reader legibility. All subsequent intelligence-brief
 * publications (One Market Monday, monthly reports, briefings) should
 * adopt the same hierarchy so subscribers see consistent visual weight.
 *
 * Use as inline-style fragments — email clients require inline CSS.
 *   <h1 style="${TYPO.h1}">...</h1>
 *
 * Sizes are intentionally larger than typical web body copy because:
 *   - Audience skews 50+ (advisor/operator/policy/investor demographics)
 *   - Inboxes render at smaller effective sizes than browsers
 *   - Mobile previews shrink another 10-15%
 */

const SANS = "'Helvetica Neue',Arial,sans-serif";
const MONO = "'Courier New',monospace";
const SERIF = "Georgia,serif";

export const TYPO = {
  // Issue headline (H1) — top of every publication
  h1: `font:700 36px/1.2 ${SANS};color:#111;letter-spacing:-0.02em;`,

  // Section heading (H2) — "The Score", "The Angle", etc.
  h2: `font:700 28px/1.3 ${SANS};color:#111;`,

  // Body paragraph (no reading text in the teens — older-reader floor)
  body: `font:20px/1.7 ${SANS};color:#333;`,

  // Body paragraph (Pulse-style muted variant)
  bodyMuted: `font:20px/1.7 ${SANS};color:#555;`,

  // Lede / subhead (italic, set in serif for editorial contrast)
  ledeSerif: `font:italic 20px/1.7 ${SERIF};color:#444;`,

  // Lede / subhead (sans-serif variant — matches Pulse)
  ledeSans: `font:20px/1.7 ${SANS};color:#555;`,

  // Callout box (highlighted paragraph inside a colored panel)
  callout: `font:20px/1.6 ${SANS};`,

  // Eyebrow / kicker — uppercase tracking label, decorative not reading
  eyebrow: `font:700 12px/1 ${MONO};letter-spacing:0.15em;text-transform:uppercase;`,

  // Date line under eyebrow
  date: `font:12px/1 ${MONO};color:#999;`,

  // Section-level eyebrow inside body (smaller than top eyebrow)
  sectionEyebrow: `font:700 12px/1 ${MONO};letter-spacing:0.1em;`,

  // Caption / footer body — readable, not reading text but still must be legible
  caption: `font:20px/1.7 ${SANS};color:#666;`,

  // Caption / footer fine print
  fineprint: `font:12px/1.6 ${SANS};color:#aaa;`,

  // Score / metric display number (large numeric)
  metric: `font:700 44px/1 ${SANS};`,

  // CTA button label
  cta: `font:700 20px/1 ${SANS};letter-spacing:0.06em;`,
} as const;

export const COLOR = {
  brand: "#5B8DB8",
  textPrimary: "#111",
  textBody: "#333",
  textMuted: "#555",
  textCaption: "#666",
  textFineprint: "#aaa",
  bgPage: "#f5f6f8",
  bgCard: "#ffffff",
  bgScoreCard: "#f3f5f8",
  borderLight: "#eef0f2",
  borderMid: "#d8dde3",
} as const;

/**
 * Structured form of the same standard, for React inline-style consumers
 * (report pages where TYPO's CSS-string form can't be used directly).
 * Single source of truth — same families, same sizes — just split into
 * the keys React `style={{ ... }}` accepts.
 */
export const FAMILY = {
  sans: "'Helvetica Neue', Arial, sans-serif",
  mono: "'Courier New', monospace",
  serif: "Georgia, serif",
} as const;

export const SIZE = {
  h1: 36,
  h2: 28,
  h3: 22,
  body: 20,
  bodySmall: 20,
  callout: 20,
  eyebrow: 12,
  date: 12,
  sectionEyebrow: 12,
  caption: 20,
  fineprint: 12,
  metric: 44,
  cta: 20,
} as const;

export const WEIGHT = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;
