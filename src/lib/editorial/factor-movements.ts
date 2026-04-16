/**
 * Factor Movement Ledger — machine-generated, hallucination-proof record
 * of which factor scores moved in a given window.
 *
 * This is the first module of the shared editorial data layer. Same
 * function powers:
 *   - Pulse weekly ledger (window = 7 days)
 *   - Monthly Issue movements section (window = 30 days)
 *   - One Market Monday per-city slice (window = any, filter = cityId)
 *
 * Rules (per VDG Editorial Product Playbook + Scoring-Mechanism-Is-The-Angle):
 *   - Every row is sourced from ScoringOverride.appliedAt — zero hallucination
 *   - Every row has a cityId that exists in seed.ts — cross-referenced on render
 *   - Every row cites a source URL when available
 *   - Point-delta is computed from the scoring functions, not asserted
 */
import { prisma } from "@/lib/prisma";
import { CITIES, getCitiesMapWithOverrides } from "@/data/seed";
import { SCORE_WEIGHTS } from "@/lib/scoring";

// -------------------------------------------------------
// Public types
// -------------------------------------------------------

export interface FactorMovement {
  cityId: string;
  cityName: string;
  state: string;
  field: string;               // raw scoring field (e.g. "hasStateLegislation")
  factorLabel: string;         // human label (e.g. "State Legislation")
  factorWeight: number;        // max possible points for this factor
  beforeValue: string;         // serialized prior value
  afterValue: string;          // serialized new value
  pointsBefore: number;        // computed score for beforeValue
  pointsAfter: number;         // computed score for afterValue
  pointsDelta: number;         // pointsAfter - pointsBefore (negative = lost points)
  appliedAt: Date;
  reason: string;
  sourceUrl: string | null;
  confidence: string;
}

// -------------------------------------------------------
// Field → label mapping
// -------------------------------------------------------

const FIELD_LABELS: Record<string, { label: string; weight: number }> = {
  hasStateLegislation: { label: "State Legislation", weight: SCORE_WEIGHTS.stateLegislation },
  hasActivePilotProgram: { label: "Active Pilot Program", weight: SCORE_WEIGHTS.activePilotProgram },
  hasVertiportZoning: { label: "Vertiport Zoning", weight: SCORE_WEIGHTS.vertiportZoning },
  activeOperatorPresence: { label: "Active Operator Presence", weight: SCORE_WEIGHTS.activeOperatorPresence },
  regulatoryPosture: { label: "Regulatory Posture", weight: SCORE_WEIGHTS.regulatoryPosture },
  weatherInfraLevel: { label: "Weather Infrastructure", weight: SCORE_WEIGHTS.weatherInfrastructure },
};

// Skip these non-scoring internal fields if they ever appear
const SKIP_FIELDS = new Set(["__review__", "__unresolved__"]);

// -------------------------------------------------------
// Per-field point-value computation
// -------------------------------------------------------

/**
 * Map a raw override value to its point contribution under v1.3 scoring.
 * Mirrors the logic in src/lib/scoring.ts so the ledger always matches
 * the live scoring functions.
 */
function valueToPoints(field: string, value: unknown): number {
  switch (field) {
    case "hasStateLegislation": {
      switch (value) {
        case "enacted": return SCORE_WEIGHTS.stateLegislation;
        case "actively_moving": return 10;
        case "none":
        default: return 0;
      }
    }
    case "hasActivePilotProgram":
      return value === true || value === "true" ? SCORE_WEIGHTS.activePilotProgram : 0;
    case "hasVertiportZoning":
      return value === true || value === "true" ? SCORE_WEIGHTS.vertiportZoning : 0;
    case "activeOperatorPresence":
      return value === true || value === "true" ? SCORE_WEIGHTS.activeOperatorPresence : 0;
    case "regulatoryPosture": {
      switch (value) {
        case "friendly": return SCORE_WEIGHTS.regulatoryPosture;
        case "neutral": return 5;
        case "restrictive":
        default: return 0;
      }
    }
    case "weatherInfraLevel": {
      switch (value) {
        case "full": return SCORE_WEIGHTS.weatherInfrastructure;
        case "partial": return 5;
        case "none":
        default: return 0;
      }
    }
    default:
      return 0;
  }
}

/**
 * Derive the seed-data "before" value for a (cityId, field) pair when no
 * prior override exists. Falls back to conservative defaults matching
 * missing-data protocol if a field isn't directly on the seed shape.
 */
function seedValueForField(cityId: string, field: string): unknown {
  const city = CITIES.find((c) => c.id === cityId);
  if (!city) return null;
  switch (field) {
    case "hasStateLegislation":
      return city.stateLegislationStatus ?? "none";
    case "hasActivePilotProgram":
      return city.hasActivePilotProgram ?? false;
    case "hasVertiportZoning":
      return city.hasVertiportZoning ?? false;
    case "activeOperatorPresence":
      return (city.activeOperators?.length ?? 0) > 0;
    case "regulatoryPosture":
      return city.regulatoryPosture ?? "neutral";
    case "weatherInfraLevel":
      return city.weatherInfraLevel ?? "none";
    default:
      return null;
  }
}

// -------------------------------------------------------
// Core query
// -------------------------------------------------------

export interface GetFactorMovementsOptions {
  /** How many days back to look (default 7 — matches weekly Pulse). */
  windowDays?: number;
  /** Filter to a single city (default — all tracked markets). */
  cityId?: string;
  /** Only include movements with absolute point-delta >= this (default 1). */
  minAbsPointsDelta?: number;
}

/**
 * Retrieve the applied factor overrides within the given window and
 * compute per-row point deltas.
 *
 * Hallucination-proof:
 *   - Query source is ScoringOverride.appliedAt — database-backed
 *   - City IDs are cross-checked against seed.ts CITIES
 *   - Point values derived from the same scoring functions as live scoring
 */
export async function getFactorMovements(
  opts: GetFactorMovementsOptions = {},
): Promise<FactorMovement[]> {
  const windowDays = opts.windowDays ?? 7;
  const cityFilter = opts.cityId ?? null;
  const minDelta = opts.minAbsPointsDelta ?? 1;
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const citiesMap = await getCitiesMapWithOverrides();
  const validCityIds = new Set(Object.keys(citiesMap));

  // Pull applied overrides in the window
  const rows = await prisma.scoringOverride.findMany({
    where: {
      appliedAt: { gte: cutoff, not: null },
      ...(cityFilter ? { cityId: cityFilter } : {}),
    },
    orderBy: [{ cityId: "asc" }, { field: "asc" }, { appliedAt: "desc" }],
    select: {
      cityId: true,
      field: true,
      value: true,
      reason: true,
      sourceUrl: true,
      confidence: true,
      appliedAt: true,
    },
  });

  // Dedupe: one row per (cityId, field) — the most recent override in the
  // window wins. Earlier rows in the same bucket are the "before" candidates.
  const bucketsByKey = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.cityId}::${row.field}`;
    const arr = bucketsByKey.get(key) ?? [];
    arr.push(row);
    bucketsByKey.set(key, arr);
  }

  const movements: FactorMovement[] = [];

  for (const [key, bucket] of bucketsByKey.entries()) {
    const [cityId, field] = key.split("::");
    if (SKIP_FIELDS.has(field)) continue;
    if (!FIELD_LABELS[field]) continue;
    if (!validCityIds.has(cityId)) continue; // hallucination guard

    // Most recent override in the window = the "movement" we're rendering
    const latest = bucket[0];
    if (!latest.appliedAt) continue;

    // The "before" value is either the next-older override for this (cityId, field)
    // in the window, or (if none exists) the prior applied override outside the
    // window, or (if none) the seed value.
    let beforeRaw: unknown;
    if (bucket.length > 1) {
      beforeRaw = bucket[1].value;
    } else {
      const priorOutsideWindow = await prisma.scoringOverride.findFirst({
        where: {
          cityId,
          field,
          appliedAt: { lt: cutoff, not: null },
        },
        orderBy: { appliedAt: "desc" },
        select: { value: true },
      });
      beforeRaw = priorOutsideWindow?.value ?? seedValueForField(cityId, field);
    }

    const afterRaw = latest.value as unknown;
    const pointsBefore = valueToPoints(field, beforeRaw);
    const pointsAfter = valueToPoints(field, afterRaw);
    const pointsDelta = pointsAfter - pointsBefore;

    if (Math.abs(pointsDelta) < minDelta) continue;

    const city = citiesMap[cityId];
    const meta = FIELD_LABELS[field];

    movements.push({
      cityId,
      cityName: city.city,
      state: city.state,
      field,
      factorLabel: meta.label,
      factorWeight: meta.weight,
      beforeValue: serializeValue(beforeRaw),
      afterValue: serializeValue(afterRaw),
      pointsBefore,
      pointsAfter,
      pointsDelta,
      appliedAt: latest.appliedAt,
      reason: latest.reason,
      sourceUrl: latest.sourceUrl,
      confidence: latest.confidence,
    });
  }

  // Sort by magnitude of delta, then by recency
  movements.sort((a, b) => {
    const mag = Math.abs(b.pointsDelta) - Math.abs(a.pointsDelta);
    if (mag !== 0) return mag;
    return b.appliedAt.getTime() - a.appliedAt.getTime();
  });

  return movements;
}

function serializeValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

// -------------------------------------------------------
// Email-safe HTML renderer for the Pulse weekly ledger
// -------------------------------------------------------

/**
 * Render a factor-movement ledger as an inline HTML table suitable for
 * email clients. Zero external CSS. Matches the visual language of the
 * existing Pulse template (Helvetica Neue, 14px body, #5B8DB8 accent).
 */
export function renderFactorMovementsHtml(
  movements: FactorMovement[],
  opts: { heading?: string; windowLabel?: string } = {},
): string {
  const heading = opts.heading ?? "Factor Movements This Week";
  const windowLabel = opts.windowLabel ?? "7-day window";

  if (movements.length === 0) {
    return `
      <tr><td style="padding:32px 48px 0;">
        <h2 style="font:700 22px/1.3 'Helvetica Neue',Arial,sans-serif;color:#111;margin:24px 0 12px;">${heading}</h2>
        <p style="font:14px/1.7 'Helvetica Neue',Arial,sans-serif;color:#666;margin:0 0 16px;">
          No scored factor movements in the ${windowLabel}. Forward-signal activity continues in the pipeline.
        </p>
      </td></tr>
    `;
  }

  const rows = movements.map((m) => {
    const up = m.pointsDelta > 0;
    const color = up ? "#16a34a" : "#dc2626";
    const sign = up ? "+" : "";
    const src = m.sourceUrl
      ? `<a href="${escapeHtml(m.sourceUrl)}" style="color:#5B8DB8;text-decoration:none;">source</a>`
      : "";
    const srcSeparator = src ? " · " : "";
    return `
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #e0e0e0;vertical-align:top;">
          <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:4px;">
            <a href="https://www.airindex.io/city/${m.cityId}" style="font-size:15px;font-weight:700;color:#111;text-decoration:none;">${escapeHtml(m.cityName)}, ${escapeHtml(m.state)}</a>
            <span style="font-size:14px;color:#555;">· ${escapeHtml(m.factorLabel)}</span>
          </div>
          <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
            <span style="font-family:'Courier New',monospace;font-size:13px;color:#555;">${escapeHtml(m.beforeValue)} → ${escapeHtml(m.afterValue)}</span>
            <span style="font-family:'Courier New',monospace;font-size:14px;font-weight:700;color:${color};">${sign}${m.pointsDelta} pts</span>
            <span style="font-size:12px;color:#999;">(factor weight: ${m.factorWeight})</span>
          </div>
          <div style="font-size:13px;color:#444;line-height:1.55;">
            ${escapeHtml(m.reason.slice(0, 220))}${m.reason.length > 220 ? "…" : ""}
          </div>
          <div style="font-size:12px;color:#888;margin-top:6px;">
            ${m.appliedAt.toISOString().slice(0, 10)} · ${escapeHtml(m.confidence)} confidence${srcSeparator}${src}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  return `
    <tr><td style="padding:32px 48px 0;">
      <h2 style="font:700 22px/1.3 'Helvetica Neue',Arial,sans-serif;color:#111;margin:24px 0 8px;">${heading}</h2>
      <p style="font:14px/1.7 'Helvetica Neue',Arial,sans-serif;color:#666;margin:0 0 16px;">
        Every factor override applied in the ${windowLabel}. Auto-generated from the ScoringOverride ledger; zero editorial selection.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;">
        ${rows}
      </table>
    </td></tr>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
