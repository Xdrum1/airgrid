/**
 * UAM Market Pulse — Newsletter HTML Generator
 *
 * Pulls live data from the database and generates a print-ready HTML file
 * that can be saved as PDF (Cmd+P → Save as PDF in browser).
 *
 * Usage:
 *   npx tsx scripts/generate-newsletter.ts
 *   npx tsx scripts/generate-newsletter.ts --issue=2 --week="March 17, 2026"
 *
 * Output: public/docs/UAM_Market_Pulse_Issue{N}.html
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Args ────────────────────────────────────────────────────────
const issueNum = parseInt(
  process.argv.find((a) => a.startsWith("--issue="))?.split("=")[1] ?? "1",
  10
);
const weekLabel =
  process.argv.find((a) => a.startsWith("--week="))?.split("=")[1] ??
  `March ${new Date().getDate()}, ${new Date().getFullYear()}`;
const DAYS_BACK = parseInt(
  process.argv.find((a) => a.startsWith("--days="))?.split("=")[1] ?? "7",
  10
);
const SINCE = new Date(Date.now() - DAYS_BACK * 86400000);

const CITY_NAMES: Record<string, { name: string; state: string }> = {
  los_angeles: { name: "Los Angeles", state: "CA" },
  dallas: { name: "Dallas", state: "TX" },
  new_york: { name: "New York", state: "NY" },
  miami: { name: "Miami", state: "FL" },
  orlando: { name: "Orlando", state: "FL" },
  columbus: { name: "Columbus", state: "OH" },
  san_francisco: { name: "San Francisco", state: "CA" },
  san_diego: { name: "San Diego", state: "CA" },
  houston: { name: "Houston", state: "TX" },
  austin: { name: "Austin", state: "TX" },
  denver: { name: "Denver", state: "CO" },
  seattle: { name: "Seattle", state: "WA" },
  atlanta: { name: "Atlanta", state: "GA" },
  phoenix: { name: "Phoenix", state: "AZ" },
  boston: { name: "Boston", state: "MA" },
  washington_dc: { name: "Washington DC", state: "DC" },
  las_vegas: { name: "Las Vegas", state: "NV" },
  minneapolis: { name: "Minneapolis", state: "MN" },
  tampa: { name: "Tampa", state: "FL" },
  charlotte: { name: "Charlotte", state: "NC" },
  detroit: { name: "Detroit", state: "MI" },
  nashville: { name: "Nashville", state: "TN" },
  chicago: { name: "Chicago", state: "IL" },
};

function fmt(cityId: string): string {
  const c = CITY_NAMES[cityId];
  return c ? `${c.name}, ${c.state}` : cityId;
}

function tierColor(tier: string): string {
  switch (tier) {
    case "ADVANCED": return "#0891b2";
    case "MODERATE": return "#16a34a";
    case "EARLY": return "#d97706";
    case "NASCENT": return "#dc2626";
    default: return "#888";
  }
}

function tierBg(tier: string): string {
  switch (tier) {
    case "ADVANCED": return "#ecfeff";
    case "MODERATE": return "#f0fdf4";
    case "EARLY": return "#fffbeb";
    case "NASCENT": return "#fef2f2";
    default: return "#f5f5f5";
  }
}

// ── Data Pulls ──────────────────────────────────────────────────

interface CityScore {
  cityId: string;
  score: number;
  tier: string;
  prevScore: number | null;
  change: string;
}

async function getScores(): Promise<CityScore[]> {
  const cityIds = await prisma.scoreSnapshot.groupBy({ by: ["cityId"] });
  const scores: CityScore[] = [];

  for (const { cityId } of cityIds) {
    const current = await prisma.scoreSnapshot.findFirst({
      where: { cityId },
      orderBy: { capturedAt: "desc" },
      select: { score: true, tier: true },
    });
    if (!current) continue;

    const weekAgo = await prisma.scoreSnapshot.findFirst({
      where: { cityId, capturedAt: { lte: SINCE } },
      orderBy: { capturedAt: "desc" },
      select: { score: true },
    });

    let change = "—";
    const prev = weekAgo?.score ?? null;
    if (prev !== null && prev !== current.score) {
      const delta = current.score - prev;
      change = delta > 0 ? `↑ +${delta}` : `↓ ${delta}`;
    }

    scores.push({
      cityId,
      score: current.score,
      tier: current.tier ?? "",
      prevScore: prev,
      change,
    });
  }

  return scores.sort((a, b) => b.score - a.score || a.cityId.localeCompare(b.cityId));
}

interface Signal {
  city: string;
  field: string;
  confidence: string;
  reason: string;
  applied: boolean;
  scoreImpact: string;
}

async function getSignals(): Promise<Signal[]> {
  const overrides = await prisma.scoringOverride.findMany({
    where: { createdAt: { gte: SINCE }, cityId: { not: "__unresolved__" } },
    select: { cityId: true, field: true, confidence: true, reason: true, appliedAt: true },
    orderBy: { confidence: "asc" },
  });

  return overrides.map((o) => ({
    city: fmt(o.cityId),
    field: o.field,
    confidence: o.confidence,
    reason: o.reason.replace(/^\[NLP\]\s*/, "").slice(0, 200),
    applied: !!o.appliedAt,
    scoreImpact: o.appliedAt ? "Score updated" : "Pending review",
  }));
}

async function getStats() {
  const total = await prisma.ingestedRecord.count();
  const classified = await prisma.classificationResult.count();
  const relevant = await prisma.classificationResult.count({
    where: { eventType: { not: "not_relevant" } },
  });
  return { total, classified, relevant };
}

// ── HTML Template ───────────────────────────────────────────────

function buildHtml(
  scores: CityScore[],
  signals: Signal[],
  stats: { total: number; classified: number; relevant: number }
): string {
  const top10 = scores.slice(0, 10);
  const avg = (scores.reduce((s, c) => s + c.score, 0) / scores.length).toFixed(1);
  const movers = scores.filter((s) => s.change !== "—");
  const leadMover = movers.find((m) => m.change.startsWith("↑"));

  // Tier groups
  const tiers = ["ADVANCED", "MODERATE", "EARLY", "NASCENT"];
  const tierRanges: Record<string, string> = {
    ADVANCED: "80–100",
    MODERATE: "60–79",
    EARLY: "20–59",
    NASCENT: "0–19",
  };

  // Deduplicate signals by city+field
  const seenSignals = new Set<string>();
  const uniqueSignals = signals.filter((s) => {
    const key = `${s.city}:${s.field}`;
    if (seenSignals.has(key)) return false;
    seenSignals.add(key);
    return true;
  });

  // Top 10 rows
  const leaderboardRows = top10
    .map(
      (s, i) => `
      <tr style="${s.change !== '—' ? 'background:#f0f9ff;' : ''}">
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#888;font-size:13px;">${i + 1}.</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#111;font-size:14px;font-weight:500;">${fmt(s.cityId)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:#111;font-size:16px;font-weight:700;text-align:center;">${s.score}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;text-align:center;">
          <span style="color:${tierColor(s.tier)};font-size:11px;font-weight:700;letter-spacing:0.5px;">${s.tier}</span>
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;color:${s.change.startsWith('↑') ? '#16a34a' : s.change.startsWith('↓') ? '#d97706' : '#aaa'};font-size:13px;text-align:right;">${s.change}</td>
      </tr>`
    )
    .join("");

  // Tier snapshot rows
  const tierRows = tiers
    .map((t) => {
      const cities = scores.filter((s) => s.tier === t);
      if (cities.length === 0) return "";
      return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;">
          <span style="display:inline-block;background:${tierColor(t)};color:#111;font-size:11px;font-weight:700;padding:4px 10px;border-radius:3px;letter-spacing:0.5px;">${t} ${tierRanges[t]}</span>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#333;font-size:13px;line-height:1.6;">
          ${cities.map((c) => fmt(c.cityId)).join(" · ")}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;color:#888;font-size:13px;text-align:right;vertical-align:top;">
          ${cities.length} market${cities.length !== 1 ? "s" : ""}
        </td>
      </tr>`;
    })
    .join("");

  // Signal rows
  const signalRows = uniqueSignals
    .slice(0, 6)
    .map(
      (s) => `
      <div style="border-left:3px solid ${s.applied ? '#16a34a' : s.confidence === 'high' ? '#0891b2' : '#d97706'};padding:12px 16px;margin-bottom:12px;background:#f9fafb;">
        <div style="color:#111;font-size:14px;font-weight:600;margin-bottom:4px;">${s.city} — ${s.field.replace(/([A-Z])/g, " $1").trim()}</div>
        <div style="color:#555;font-size:13px;line-height:1.5;">${s.reason}</div>
        <div style="color:${s.applied ? '#16a34a' : '#888'};font-size:11px;margin-top:6px;font-weight:500;">${s.confidence.toUpperCase()} · ${s.scoreImpact}</div>
      </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UAM Market Pulse — Issue ${issueNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #ffffff; color: #333; font-family: 'Inter', sans-serif; }
    @media print {
      body { background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
    }
    @page { size: letter; margin: 0.5in; }
  </style>
</head>
<body>
  <div style="max-width:760px;margin:0 auto;padding:40px 24px;">

    <!-- HEADER -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding:20px 24px;background:#0a0a12;border-radius:8px;">
      <div>
        <h1 style="color:#111;font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;margin:0 0 4px;">UAM MARKET PULSE</h1>
        <div style="color:#999;font-size:13px;">by AirIndex · airindex.io</div>
      </div>
      <div style="text-align:right;">
        <div style="color:#00c2ff;font-size:18px;font-weight:700;">ISSUE ${issueNum}</div>
        <div style="color:#999;font-size:12px;margin-top:2px;">Week of ${weekLabel}</div>
        <div style="color:#777;font-size:11px;">Weekly UAM Intelligence</div>
      </div>
    </div>

    <!-- INTRO -->
    <div style="background:#f0f9ff;border:1px solid #e0e7ee;border-radius:8px;padding:20px 24px;margin-bottom:32px;">
      <p style="color:#333;font-size:14px;line-height:1.7;">
        <strong style="color:#111;">Welcome to Issue ${issueNum} of UAM Market Pulse</strong> — a weekly intelligence briefing from AirIndex tracking the cities, regulations, and operators shaping the future of commercial eVTOL in the United States. Each week we surface what moved, what matters, and what to watch.
      </p>
    </div>

    ${
      leadMover
        ? `
    <!-- LEAD STORY -->
    <div style="margin-bottom:36px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="background:#ef4444;color:#111;font-size:11px;font-weight:700;padding:6px 12px;border-radius:4px;letter-spacing:0.5px;">LEAD STORY</span>
        <h2 style="color:#111;font-size:22px;font-weight:700;">${fmt(leadMover.cityId)} Hits ${leadMover.score} — ${leadMover.score === 100 ? "A Perfect UAM Readiness Score" : "Score Moves " + leadMover.change}</h2>
      </div>
      <p style="color:#333;font-size:14px;line-height:1.7;margin-bottom:16px;">
        ${fmt(leadMover.cityId)} ${leadMover.score === 100 ? `became one of the U.S. cities to achieve a perfect score on the AirIndex UAM Market Readiness Index this week, jumping from ${leadMover.prevScore} to ${leadMover.score}.` : `saw its readiness score change from ${leadMover.prevScore} to ${leadMover.score} this week.`}
        ${fmt(leadMover.cityId)} now holds all seven readiness factors: an active pilot program, an approved vertiport, active operator presence, vertiport zoning, a favorable regulatory posture, state legislation, and full LAANC airspace coverage.
      </p>
      <div style="background:#f9fafb;border-left:3px solid #d97706;padding:14px 18px;border-radius:0 6px 6px 0;">
        <p style="color:#ccc;font-size:13px;line-height:1.6;"><strong style="color:#111;">Why it matters:</strong> Markets achieving top-tier readiness scores carry a credibility advantage in operator route planning and infrastructure investment decisions.</p>
      </div>
    </div>`
        : ""
    }

    <!-- LEADERBOARD -->
    <div style="margin-bottom:36px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="background:#00c2ff;color:#000;font-size:11px;font-weight:700;padding:6px 12px;border-radius:4px;letter-spacing:0.5px;">MARKET DATA</span>
        <h2 style="color:#111;font-size:20px;font-weight:700;">UAM Readiness Leaderboard — Top 10</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb;">
            <th style="padding:8px 16px;text-align:left;color:#888;font-size:11px;font-weight:600;letter-spacing:0.5px;width:36px;">#</th>
            <th style="padding:8px 16px;text-align:left;color:#888;font-size:11px;font-weight:600;letter-spacing:0.5px;">MARKET</th>
            <th style="padding:8px 16px;text-align:center;color:#888;font-size:11px;font-weight:600;letter-spacing:0.5px;">SCORE</th>
            <th style="padding:8px 16px;text-align:center;color:#888;font-size:11px;font-weight:600;letter-spacing:0.5px;">TIER</th>
            <th style="padding:8px 16px;text-align:right;color:#888;font-size:11px;font-weight:600;letter-spacing:0.5px;">CHANGE</th>
          </tr>
        </thead>
        <tbody>${leaderboardRows}</tbody>
      </table>
      <p style="color:#666;font-size:12px;margin-top:12px;text-align:center;">
        Average score across all ${scores.length} tracked markets: ${avg} · Full index at airindex.io
      </p>
    </div>

    <!-- REGULATORY SIGNALS -->
    ${
      uniqueSignals.length > 0
        ? `
    <div style="margin-bottom:36px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="background:#f59e0b;color:#000;font-size:11px;font-weight:700;padding:6px 12px;border-radius:4px;letter-spacing:0.5px;">REGULATORY</span>
        <h2 style="color:#111;font-size:20px;font-weight:700;">What Moved This Week</h2>
      </div>
      ${signalRows}
    </div>`
        : ""
    }

    <!-- TIER SNAPSHOT -->
    <div class="page-break" style="margin-bottom:36px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="background:#00c2ff;color:#000;font-size:11px;font-weight:700;padding:6px 12px;border-radius:4px;letter-spacing:0.5px;">INDEX SNAPSHOT</span>
        <h2 style="color:#111;font-size:20px;font-weight:700;">Markets by Tier — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${tierRows}</tbody>
      </table>
    </div>

    <!-- WHAT TO WATCH -->
    <div style="margin-bottom:36px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="background:#ef4444;color:#111;font-size:11px;font-weight:700;padding:6px 12px;border-radius:4px;letter-spacing:0.5px;">LOOKING AHEAD</span>
        <h2 style="color:#111;font-size:20px;font-weight:700;">What to Watch — Next 30 Days</h2>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;gap:16px;align-items:flex-start;">
          <span style="color:#0891b2;font-size:24px;font-weight:700;min-width:32px;">1</span>
          <div>
            <div style="color:#111;font-size:14px;font-weight:600;margin-bottom:4px;">Joby Aviation FAA Certification Progress</div>
            <div style="color:#555;font-size:13px;line-height:1.6;">Joby's conforming aircraft test flights are the leading indicator of Part 135 air carrier certification. Any FAA milestone will trigger scoring reviews across Joby markets.</div>
          </div>
        </div>
        <div style="display:flex;gap:16px;align-items:flex-start;">
          <span style="color:#0891b2;font-size:24px;font-weight:700;min-width:32px;">2</span>
          <div>
            <div style="color:#111;font-size:14px;font-weight:600;margin-bottom:4px;">State Legislature Sessions</div>
            <div style="color:#555;font-size:13px;line-height:1.6;">Several state legislatures are in active session with UAM-adjacent bills in committee. Texas, Florida, and North Carolina are markets to watch for new legislation signals.</div>
          </div>
        </div>
        <div style="display:flex;gap:16px;align-items:flex-start;">
          <span style="color:#0891b2;font-size:24px;font-weight:700;min-width:32px;">3</span>
          <div>
            <div style="color:#111;font-size:14px;font-weight:600;margin-bottom:4px;">White House AAM Program — City Announcements</div>
            <div style="color:#555;font-size:13px;line-height:1.6;">Additional city-level announcements from the White House Advanced Air Mobility program are expected. Any indexed city receiving a designation will see an immediate scoring review.</div>
          </div>
        </div>
        <div style="display:flex;gap:16px;align-items:flex-start;">
          <span style="color:#0891b2;font-size:24px;font-weight:700;min-width:32px;">4</span>
          <div>
            <div style="color:#111;font-size:14px;font-weight:600;margin-bottom:4px;">AirIndex Pro Launch — April 2026</div>
            <div style="color:#555;font-size:13px;line-height:1.6;">Full data access, city deep-dives, corridor maps, and the Intel Feed move to paid tiers in April. Free tier access remains available. Early access requests open at airindex.io.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="border-top:2px solid #e5e7eb;padding-top:24px;margin-top:40px;">
      <div style="color:#888;font-size:12px;font-weight:600;letter-spacing:0.5px;margin-bottom:8px;">ABOUT AIRINDEX</div>
      <p style="color:#888;font-size:12px;line-height:1.6;margin-bottom:12px;">
        AirIndex is a UAM market intelligence platform scoring ${scores.length} U.S. cities on their readiness for commercial eVTOL operations.
        Scores are updated automatically when qualifying regulatory, legislative, or operator events are detected.
      </p>
      <p style="color:#666;font-size:12px;">
        airindex.io · @AirIndexHQ · hello@airindex.io
      </p>
      <p style="color:#444;font-size:11px;margin-top:16px;">
        UAM Market Pulse · AirIndex by Vertical Data Group, LLC · airindex.io &nbsp;&nbsp;|&nbsp;&nbsp; Issue ${issueNum} · Week of ${weekLabel}
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`Generating UAM Market Pulse Issue ${issueNum}...`);
  console.log(`  Week: ${weekLabel}`);
  console.log(`  Lookback: ${DAYS_BACK} days\n`);

  const [scores, signals, stats] = await Promise.all([
    getScores(),
    getSignals(),
    getStats(),
  ]);

  console.log(`  Scores: ${scores.length} cities`);
  console.log(`  Signals: ${signals.length} this week`);
  console.log(`  Pipeline: ${stats.total} ingested, ${stats.relevant} relevant\n`);

  const html = buildHtml(scores, signals, stats);
  const outPath = `public/docs/UAM_Market_Pulse_Issue${issueNum}.html`;
  writeFileSync(outPath, html);

  console.log(`  Output: ${outPath}`);
  console.log(`\nOpen in browser and Cmd+P → Save as PDF.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
