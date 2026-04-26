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

  // Body paragraph
  body: `font:19px/1.7 ${SANS};color:#333;`,

  // Body paragraph (Pulse-style muted variant)
  bodyMuted: `font:19px/1.7 ${SANS};color:#555;`,

  // Lede / subhead (italic, set in serif for editorial contrast)
  ledeSerif: `font:italic 19px/1.7 ${SERIF};color:#444;`,

  // Lede / subhead (sans-serif variant — matches Pulse)
  ledeSans: `font:19px/1.7 ${SANS};color:#555;`,

  // Callout box (highlighted paragraph inside a colored panel)
  callout: `font:18px/1.6 ${SANS};`,

  // Eyebrow / kicker — "ONE MARKET MONDAY · Issue 04"
  eyebrow: `font:700 14px/1 ${MONO};letter-spacing:0.15em;text-transform:uppercase;`,

  // Date line under eyebrow
  date: `font:14px/1 ${MONO};color:#999;`,

  // Section-level eyebrow inside body (smaller than top eyebrow)
  sectionEyebrow: `font:700 13px/1 ${MONO};letter-spacing:0.1em;`,

  // Caption / footer body
  caption: `font:13px/1.7 ${SANS};color:#666;`,

  // Caption / footer fine print
  fineprint: `font:11px/1.6 ${SANS};color:#aaa;`,

  // Score / metric display number (large numeric)
  metric: `font:700 44px/1 ${SANS};`,

  // CTA button label
  cta: `font:700 14px/1 ${SANS};letter-spacing:0.06em;`,
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
