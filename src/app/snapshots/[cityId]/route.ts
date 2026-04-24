/**
 * Canonical AirIndex Market Snapshot — 1080×1350 shareable card.
 * Renders one city's readiness state as a portable, LinkedIn-ready visual.
 *
 * URL: /snapshots/[cityId]  (e.g. /snapshots/miami, /snapshots/phoenix)
 *
 * Returns pure HTML (not wrapped in app layout). Screenshot-friendly.
 * Companion script: scripts/render-snapshot.ts renders any city to PNG.
 */
import { NextResponse } from "next/server";
import { getCitiesWithOverrides } from "@/data/seed";
import { calculateReadinessScore, getScoreTier } from "@/lib/scoring";
import { getPrimaryConstraint, getNextTrigger } from "@/lib/market-command";
import type { City, ScoreBreakdown } from "@/types";

type FactorKey = keyof ScoreBreakdown;

const FACTOR_META: Record<FactorKey, { label: string; weight: number }> = {
  stateLegislation: { label: "Legislation", weight: 20 },
  activePilotProgram: { label: "Active pilot program", weight: 15 },
  vertiportZoning: { label: "Vertiport zoning", weight: 15 },
  approvedVertiport: { label: "Approved vertiport", weight: 15 },
  activeOperatorPresence: { label: "Operator presence", weight: 15 },
  regulatoryPosture: { label: "Regulatory posture", weight: 10 },
  weatherInfrastructure: { label: "Weather infra", weight: 10 },
};

const FACTOR_ORDER: FactorKey[] = [
  "stateLegislation",
  "activeOperatorPresence",
  "vertiportZoning",
  "approvedVertiport",
  "activePilotProgram",
  "regulatoryPosture",
  "weatherInfrastructure",
];

// Maps constraint factor → the buyer-meaningful "area" for the view line.
const CONSTRAINT_AREA: Record<FactorKey, string> = {
  activePilotProgram: "operational validation",
  approvedVertiport: "approved infrastructure",
  stateLegislation: "legislative foundation",
  activeOperatorPresence: "operator commitment",
  vertiportZoning: "zoning clarity",
  regulatoryPosture: "executive support",
  weatherInfrastructure: "weather readiness",
};

// Maps trigger factor → the concrete unlock language.
const TRIGGER_HEADLINE: Record<FactorKey, string> = {
  activePilotProgram: "Confirmed first eVTOL demo flight",
  approvedVertiport: "First vertiport approved",
  stateLegislation: "State legislation enacted",
  activeOperatorPresence: "Operator commits publicly",
  vertiportZoning: "Vertiport zoning ordinance adopted",
  regulatoryPosture: "Posture shifts friendly",
  weatherInfrastructure: "Low-altitude weather sensing deployed",
};

const CONSTRAINT_HEADLINE: Record<FactorKey, { main: string; sub: string }> = {
  activePilotProgram: {
    main: "No active pilot program",
    sub: "no real-world flight validation",
  },
  approvedVertiport: {
    main: "No approved vertiport",
    sub: "no committed physical infrastructure",
  },
  stateLegislation: {
    main: "No enacted AAM legislation",
    sub: "statutory framework incomplete",
  },
  activeOperatorPresence: {
    main: "No committed operator",
    sub: "no publicly-announced market entry",
  },
  vertiportZoning: {
    main: "No vertiport zoning",
    sub: "permitting pathway undefined",
  },
  regulatoryPosture: {
    main: "Neutral or restrictive posture",
    sub: "no executive-level AAM mandate",
  },
  weatherInfrastructure: {
    main: "No low-altitude weather infrastructure",
    sub: "critical below-5K sensing gap",
  },
};

function generateViewLine(
  city: City,
  score: number,
  constraint: { factor: FactorKey } | null,
): string {
  const area = constraint ? CONSTRAINT_AREA[constraint.factor] : null;
  if (!area) return `${city.city} has cleared every tracked factor.`;
  if (score >= 75) return `${city.city} is structurally ready — but lacks ${area}.`;
  if (score >= 50) return `${city.city} has momentum — but ${area} remains the binding gap.`;
  return `${city.city} is still building toward readiness — ${area} is the first unlock.`;
}

function tierColor(tier: string): string {
  if (tier === "ADVANCED") return "var(--ok)";
  if (tier === "MODERATE") return "var(--accent)";
  return "var(--warn)";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderFactorRow(
  key: FactorKey,
  earned: number,
  max: number,
): string {
  const label = FACTOR_META[key].label;
  const pct = Math.max(3, Math.round((earned / max) * 100)); // min 3% so even 0 shows a trace
  const isFull = earned === max;
  const isPartial = earned > 0 && earned < max;
  const fillClass = isFull ? "full" : isPartial ? "partial" : "missing";
  const ptsClass = earned === 0 ? "zero" : isPartial ? "partial" : "";
  return `
    <div class="factor-row">
      <div class="factor-label">${label}</div>
      <div class="factor-bar"><div class="factor-bar-fill ${fillClass}" style="width:${pct}%"></div></div>
      <div class="factor-pts ${ptsClass}">${earned}/${max}</div>
    </div>`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cityId: string }> },
) {
  const { cityId } = await params;

  const cities = await getCitiesWithOverrides();
  const city = cities.find((c) => c.id === cityId);
  if (!city) {
    return new NextResponse("City not found", { status: 404 });
  }

  const { score, breakdown } = calculateReadinessScore(city);
  const cityWithBreakdown: City = { ...city, breakdown };
  const constraint = getPrimaryConstraint(cityWithBreakdown);
  const trigger = getNextTrigger(cityWithBreakdown);
  const tier = getScoreTier(score);
  const viewLine = generateViewLine(city, score, constraint);

  const today = new Date().toISOString().slice(0, 10);

  const factorRowsHtml = FACTOR_ORDER.map((k) =>
    renderFactorRow(k, breakdown[k], FACTOR_META[k].weight),
  ).join("");

  const constraintBlock = constraint
    ? (() => {
        const { main, sub } = CONSTRAINT_HEADLINE[constraint.factor];
        return `
          <div class="insight constraint">
            <div class="insight-tag">Primary Constraint</div>
            <div class="insight-headline">${escapeHtml(main)} <span style="color: var(--dim); font-weight: 400;">(${escapeHtml(sub)})</span></div>
            <div class="insight-sub">Holding <strong>&minus;${constraint.gap}</strong> pts off score.</div>
          </div>`;
      })()
    : `
        <div class="insight" style="border-left-color: var(--ok);">
          <div class="insight-tag" style="color: var(--ok);">No Constraints</div>
          <div class="insight-headline">All tracked factors cleared.</div>
          <div class="insight-sub">Maintain — no gap to close.</div>
        </div>`;

  const triggerBlock = trigger
    ? `
        <div class="insight trigger">
          <div class="insight-tag">Trigger to Watch</div>
          <div class="insight-headline">${escapeHtml(TRIGGER_HEADLINE[trigger.factor])}</div>
          <div class="insight-sub">Potential move: <strong>${score} &rarr; ${Math.min(100, score + trigger.potentialGain)}</strong>.</div>
        </div>`
    : `
        <div class="insight" style="border-left-color: var(--dim);">
          <div class="insight-tag" style="color: var(--dim);">At Ceiling</div>
          <div class="insight-headline">No further triggers available in model.</div>
          <div class="insight-sub">Market at tracked-factor ceiling.</div>
        </div>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(city.city)}, ${escapeHtml(city.state)} — AirIndex Market Snapshot</title>
<meta name="viewport" content="width=1080, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #060608; --ink: #ffffff; --dim: #8a8a8a; --dimmer: #4a4a4a;
    --accent: #5B8DB8; --warn: #C97B63; --ok: #6BA57A;
    --line: #1e1e1e; --line-soft: #141414;
    --tier-color: ${tierColor(tier)};
  }
  * { box-sizing: border-box; margin: 0; padding: 0; overflow-wrap: break-word; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  body {
    background: #141414;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    color: var(--ink);
    display: flex; align-items: center; justify-content: center;
  }
  .stage-wrapper {
    position: relative;
    width: min(96vw, calc(96vh * 1080 / 1350));
    aspect-ratio: 1080 / 1350;
    overflow: hidden;
    background: var(--bg);
  }
  .card {
    position: absolute; top: 0; left: 0;
    width: 1080px; height: 1350px;
    background: var(--bg);
    transform-origin: top left;
    transform: scale(calc(min(96vw, 96vh * 1080 / 1350) / 1080px));
    display: grid;
    grid-template-rows: auto auto auto 1fr auto auto;
    padding: 64px 72px 52px;
    gap: 0;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
  .brand {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 14px; font-weight: 500;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--dim);
  }
  .brand .accent { color: var(--accent); }
  .doc-type { color: var(--ink); margin-left: 8px; }
  .meta-right {
    text-align: right;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px; color: var(--dim);
    letter-spacing: 0.1em; line-height: 1.7;
  }
  .aix-view { padding: 22px 0 22px; border-bottom: 1px solid var(--line-soft); }
  .aix-view-tag {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px; font-weight: 500;
    letter-spacing: 0.24em; text-transform: uppercase;
    color: var(--accent); margin-bottom: 10px;
  }
  .aix-view-line {
    font-size: 22px; font-weight: 500;
    line-height: 1.35; letter-spacing: -0.01em;
  }
  .city-block { padding: 28px 0 24px; }
  .city-name {
    font-size: 84px; font-weight: 600; letter-spacing: -0.03em;
    line-height: 1; color: var(--ink);
  }
  .city-meta {
    margin-top: 12px;
    font-size: 18px; color: var(--dim);
    letter-spacing: 0.12em; text-transform: uppercase;
  }
  .score-hero {
    display: grid; grid-template-columns: 1fr auto;
    align-items: end;
    padding: 18px 0 30px;
    border-top: 1px solid var(--line-soft);
    border-bottom: 1px solid var(--line-soft);
  }
  .score-label-col { display: flex; flex-direction: column; gap: 10px; }
  .score-label-sm {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--dim);
  }
  .score-tier {
    font-size: 28px; font-weight: 600; letter-spacing: -0.01em;
    color: var(--tier-color);
  }
  .score-context {
    font-size: 13px; color: var(--dim);
    font-family: "JetBrains Mono", monospace; letter-spacing: 0.08em;
  }
  .score-number {
    font-size: 200px; font-weight: 600; line-height: 0.95;
    letter-spacing: -0.04em; color: var(--tier-color);
    display: flex; align-items: flex-end;
  }
  .score-max {
    font-size: 36px; color: var(--dim); font-weight: 400;
    margin-bottom: 18px; margin-left: 6px;
  }
  .factors { padding: 24px 0 18px; display: flex; flex-direction: column; gap: 10px; }
  .factor-header {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-bottom: 8px;
  }
  .factor-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--dim);
  }
  .factor-total {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px; color: var(--dimmer); letter-spacing: 0.1em;
  }
  .factor-row {
    display: grid;
    grid-template-columns: 170px 1fr 56px;
    align-items: center; gap: 16px;
  }
  .factor-label { font-size: 15px; color: var(--ink); font-weight: 400; }
  .factor-bar {
    height: 6px; background: var(--line-soft); border-radius: 1px;
    position: relative; overflow: hidden;
  }
  .factor-bar-fill {
    position: absolute; top: 0; left: 0; height: 100%;
    background: var(--accent);
  }
  .factor-bar-fill.full { background: var(--ok); }
  .factor-bar-fill.partial { background: var(--accent); }
  .factor-bar-fill.missing { background: var(--warn); }
  .factor-pts {
    font-family: "JetBrains Mono", monospace;
    font-size: 14px; text-align: right;
    color: var(--ink); font-weight: 500;
  }
  .factor-pts.zero { color: var(--warn); }
  .factor-pts.partial { color: var(--dim); }
  .insights {
    display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
    padding-top: 22px;
  }
  .insight {
    border: 1px solid var(--line);
    border-left-width: 3px;
    padding: 18px 20px;
    background: #0a0a0c;
  }
  .insight.constraint { border-left-color: var(--warn); }
  .insight.trigger { border-left-color: var(--accent); }
  .insight-tag {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
    margin-bottom: 10px;
  }
  .insight.constraint .insight-tag { color: var(--warn); }
  .insight.trigger .insight-tag { color: var(--accent); }
  .insight-headline {
    font-size: 22px; font-weight: 500; line-height: 1.25;
    color: var(--ink); letter-spacing: -0.01em;
    margin-bottom: 10px;
  }
  .insight-sub { font-size: 14px; color: var(--dim); line-height: 1.5; }
  .insight-sub strong {
    color: var(--ink); font-weight: 500;
    font-family: "JetBrains Mono", monospace;
  }
  .footer {
    display: flex; justify-content: space-between; align-items: center;
    padding-top: 22px; border-top: 1px solid var(--line);
    margin-top: 22px;
  }
  .footer-brand {
    font-family: "JetBrains Mono", monospace;
    font-size: 14px; font-weight: 500;
    letter-spacing: 0.15em; text-transform: uppercase;
  }
  .footer-brand .accent { color: var(--accent); }
  .footer-note {
    font-size: 12px; color: var(--dim);
    font-family: "JetBrains Mono", monospace;
    letter-spacing: 0.08em;
  }
</style>
</head>
<body>
  <div class="stage-wrapper">
    <div class="card">
      <div class="header">
        <div class="brand">
          <span class="accent">AIR</span>INDEX<span class="doc-type">&middot;&nbsp;MARKET SNAPSHOT</span>
        </div>
        <div class="meta-right">
          AS OF ${today}<br>
          AIS v1.3
        </div>
      </div>
      <div class="aix-view">
        <div class="aix-view-tag">AirIndex view</div>
        <div class="aix-view-line">${escapeHtml(viewLine)}</div>
      </div>
      <div class="city-block">
        <div class="city-name">${escapeHtml(city.city)}, ${escapeHtml(city.state)}</div>
        <div class="city-meta">${escapeHtml(city.metro)} &middot; ${escapeHtml(city.country)}</div>
      </div>
      <div class="score-hero">
        <div class="score-label-col">
          <div class="score-label-sm">AirIndex Score</div>
          <div class="score-tier">${tier}</div>
          <div class="score-context">AIS &middot; 0&ndash;100 &middot; updated ${today}</div>
        </div>
        <div class="score-number">${score}<span class="score-max">/100</span></div>
      </div>
      <div class="factors">
        <div class="factor-header">
          <div class="factor-title">Factor Breakdown</div>
          <div class="factor-total">Weights &middot; AIS v1.3</div>
        </div>
        ${factorRowsHtml}
      </div>
      <div class="insights">
        ${constraintBlock}
        ${triggerBlock}
      </div>
      <div class="footer">
        <div class="footer-brand">
          <span class="accent">AIR</span>INDEX<span style="color: var(--dim); margin-left: 10px;">&middot; Market &amp; Infrastructure Intelligence</span>
        </div>
        <div class="footer-note">AIRINDEX.IO</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
