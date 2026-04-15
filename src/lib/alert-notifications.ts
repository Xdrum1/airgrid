import { prisma } from "@/lib/prisma";
import { sendSesEmail } from "@/lib/ses";
import { hasAlertAccess } from "@/lib/billing-shared";
import { createLogger } from "@/lib/logger";

const logger = createLogger("alert-notifications");

const CITY_NAMES: Record<string, string> = {
  los_angeles: "Los Angeles, CA",
  dallas: "Dallas, TX",
  new_york: "New York, NY",
  miami: "Miami, FL",
  orlando: "Orlando, FL",
  columbus: "Columbus, OH",
  san_francisco: "San Francisco, CA",
  san_diego: "San Diego, CA",
  houston: "Houston, TX",
  austin: "Austin, TX",
  denver: "Denver, CO",
  seattle: "Seattle, WA",
  atlanta: "Atlanta, GA",
  phoenix: "Phoenix, AZ",
  boston: "Boston, MA",
  washington_dc: "Washington DC",
  las_vegas: "Las Vegas, NV",
  minneapolis: "Minneapolis, MN",
  tampa: "Tampa, FL",
  charlotte: "Charlotte, NC",
  detroit: "Detroit, MI",
  nashville: "Nashville, TN",
  chicago: "Chicago, IL",
};

function cityName(id: string): string {
  return CITY_NAMES[id] || id;
}

// -------------------------------------------------------
// Score change alert email
// -------------------------------------------------------

function buildScoreChangeEmail(
  changes: { cityId: string; oldScore: number; newScore: number; tier: string }[],
  appUrl: string
): string {
  const rows = changes
    .map((c) => {
      const delta = c.newScore - c.oldScore;
      const arrow = delta > 0 ? "↑" : "↓";
      const color = delta > 0 ? "#15803d" : "#dc2626";
      return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
          <a href="${appUrl}/city/${c.cityId}" style="color:#1a1a1a;font-size:15px;font-weight:600;text-decoration:none;">${cityName(c.cityId)}</a>
          <div style="color:#888;font-size:12px;margin-top:2px;">${c.tier}</div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;text-align:right;">
          <span style="color:${color};font-weight:700;font-size:16px;">${arrow} ${Math.abs(delta)}</span>
          <div style="color:#888;font-size:12px;margin-top:2px;">${c.oldScore} → ${c.newScore}</div>
        </td>
      </tr>`;
    })
    .join("");

  return `
    <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
      <div style="margin-bottom:32px;">
        <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>
      </div>
      <p style="color:#1a1a1a;font-size:18px;font-weight:700;margin:0 0 8px;">Score Change Alert</p>
      <p style="color:#888;font-size:13px;margin:0 0 24px;">${changes.length} of your monitored market${changes.length === 1 ? "" : "s"} changed today</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${rows}
      </table>
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}/dashboard" style="display:inline-block;background:#0077aa;color:#ffffff;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">View Dashboard</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px;" />
      <p style="color:#999;font-size:11px;line-height:1.6;margin:0;">
        You're receiving this because you monitor these markets on AirIndex.
        <br/><a href="${appUrl}/dashboard" style="color:#999;text-decoration:underline;">Manage your watchlist</a>
      </p>
    </div>
  `.trim();
}

// -------------------------------------------------------
// Watch list alert email
// -------------------------------------------------------

function buildWatchlistAlertEmail(
  entries: { cityId: string; triggerType: string; triggerDetail: string }[],
  appUrl: string
): string {
  const rows = entries
    .map((e) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:4px;padding:2px 8px;display:inline-block;margin-bottom:6px;">
            <span style="color:#92400e;font-size:10px;font-weight:700;letter-spacing:1px;">${e.triggerType.replace("_", " ")}</span>
          </div>
          <p style="color:#1a1a1a;font-size:14px;font-weight:600;margin:0 0 4px;">${cityName(e.cityId)}</p>
          <p style="color:#555;font-size:13px;line-height:1.5;margin:0;">${e.triggerDetail}</p>
        </td>
      </tr>`)
    .join("");

  return `
    <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
      <div style="margin-bottom:32px;">
        <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>
      </div>
      <p style="color:#1a1a1a;font-size:18px;font-weight:700;margin:0 0 8px;">Watch List Alert</p>
      <p style="color:#888;font-size:13px;margin:0 0 24px;">${entries.length} new watch list entr${entries.length === 1 ? "y" : "ies"} for your monitored markets</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        ${rows}
      </table>
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}/watchlist" style="display:inline-block;background:#0077aa;color:#ffffff;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">View Watch List</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px;" />
      <p style="color:#999;font-size:11px;line-height:1.6;margin:0;">
        You're receiving this because you monitor these markets on AirIndex.
        <br/><a href="${appUrl}/dashboard" style="color:#999;text-decoration:underline;">Manage your watchlist</a>
      </p>
    </div>
  `.trim();
}

// -------------------------------------------------------
// Monthly summary email
// -------------------------------------------------------

function buildMonthlySummaryEmail(
  markets: { cityId: string; score: number; tier: string; delta: number | null }[],
  month: string,
  appUrl: string
): string {
  const rows = markets
    .map((m) => {
      let changeText = "No change";
      let changeColor = "#888";
      if (m.delta !== null && m.delta !== 0) {
        changeText = m.delta > 0 ? `+${m.delta}` : `${m.delta}`;
        changeColor = m.delta > 0 ? "#15803d" : "#dc2626";
      }
      return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
          <a href="${appUrl}/city/${m.cityId}" style="color:#1a1a1a;font-size:14px;font-weight:600;text-decoration:none;">${cityName(m.cityId)}</a>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:center;">
          <span style="font-weight:700;font-size:15px;color:#1a1a1a;">${m.score}</span>
          <span style="color:#888;font-size:11px;margin-left:4px;">${m.tier}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;">
          <span style="color:${changeColor};font-weight:600;font-size:13px;">${changeText}</span>
        </td>
      </tr>`;
    })
    .join("");

  return `
    <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:520px;margin:0 auto;">
      <div style="margin-bottom:32px;">
        <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>
      </div>
      <p style="color:#1a1a1a;font-size:18px;font-weight:700;margin:0 0 8px;">Monthly Market Summary</p>
      <p style="color:#888;font-size:13px;margin:0 0 24px;">${month} — Your ${markets.length} monitored market${markets.length === 1 ? "" : "s"}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;border-bottom:2px solid #e5e7eb;font-size:11px;color:#888;font-weight:700;letter-spacing:1px;">MARKET</td>
          <td style="padding:8px 0;border-bottom:2px solid #e5e7eb;font-size:11px;color:#888;font-weight:700;letter-spacing:1px;text-align:center;">SCORE</td>
          <td style="padding:8px 0;border-bottom:2px solid #e5e7eb;font-size:11px;color:#888;font-weight:700;letter-spacing:1px;text-align:right;">30-DAY</td>
        </tr>
        ${rows}
      </table>
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}/dashboard" style="display:inline-block;background:#0077aa;color:#ffffff;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">View Full Dashboard</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px;" />
      <p style="color:#999;font-size:11px;line-height:1.6;margin:0;">
        You're receiving this monthly summary because you have an AirIndex Alert subscription.
        <br/><a href="${appUrl}/dashboard" style="color:#999;text-decoration:underline;">Manage your watchlist</a>
      </p>
    </div>
  `.trim();
}

// -------------------------------------------------------
// Forward Signal Alert email
// -------------------------------------------------------
// Proactive alert: fires when a new high-confidence near-term forward
// signal is generated for a watched market, BEFORE the score actually
// moves. Complements the reactive score-change alert above.

interface ForwardSignalAlertItem {
  predictionId: string;
  cityId: string;
  description: string;
  windowLabel: string;
  confidence: string;
  direction: string;
  pointsIfRealized: number;
  factor: string | null;
}

// Maps User.buyerType to the persona framing used in forward-signal alerts.
// Accent color matches each briefing's own accent so the client sees a
// consistent visual through the whole funnel.
interface PersonaStyling {
  accent: string;
  intro: string;
  ctaLabel: string;
  briefingRoute: string; // route segment: /reports/<route>/<cityId>
  ctaLabelPerMarket: (cityName: string) => string;
}

const PERSONA_STYLING: Record<string, PersonaStyling> = {
  "infra-developer": {
    accent: "#00d4ff",
    intro: "New forward signals for your watched markets. These project near-term changes to infrastructure readiness and development-approval conditions.",
    ctaLabel: "View Infrastructure Briefing",
    briefingRoute: "briefing",
    ctaLabelPerMarket: (c) => `View ${c} Infrastructure Briefing`,
  },
  operator: {
    accent: "#7c3aed",
    intro: "New forward signals for your watched markets. Fresh predictions on regulatory friction, operator landscape shifts, and infrastructure availability likely to affect market-entry timing.",
    ctaLabel: "View Operator Briefing",
    briefingRoute: "briefing-operator",
    ctaLabelPerMarket: (c) => `View ${c} Operator Briefing`,
  },
  municipality: {
    accent: "#5B8DB8",
    intro: "New forward signals for your watched markets. Peer-market activity, state regulatory shifts, and operator moves that affect your comparative positioning.",
    ctaLabel: "View Municipality Briefing",
    briefingRoute: "briefing-municipality",
    ctaLabelPerMarket: (c) => `View ${c} Municipality Briefing`,
  },
  "heliport-owner": {
    accent: "#b45309",
    intro: "New forward signals for your watched markets. These may affect regulatory compliance posture, airspace determination status, or portfolio exposure on facilities you operate.",
    ctaLabel: "View Insurance Briefing",
    briefingRoute: "briefing-insurance",
    ctaLabelPerMarket: (c) => `View ${c} Insurance Briefing`,
  },
  insurance: {
    accent: "#b45309",
    intro: "New forward signals for your watched markets. These forecast near-term regulatory and compliance-posture shifts that affect underwriting exposure.",
    ctaLabel: "View Insurance Briefing",
    briefingRoute: "briefing-insurance",
    ctaLabelPerMarket: (c) => `View ${c} Insurance Briefing`,
  },
  federal: {
    accent: "#0369a1",
    intro: "New forward signals for your watched markets. Fresh predictions on regulatory catalysts, operator capital flow, and federal-program-relevant developments.",
    ctaLabel: "View Investor Briefing",
    briefingRoute: "briefing-investor",
    ctaLabelPerMarket: (c) => `View ${c} Investor Briefing`,
  },
  other: {
    accent: "#0077aa",
    intro: "New predictive signals for your watched markets. These forecast near-term changes that haven't moved scores yet.",
    ctaLabel: "View Dashboard",
    briefingRoute: "briefing",
    ctaLabelPerMarket: () => "View Dashboard",
  },
};

function getPersonaStyling(buyerType: string | null): PersonaStyling {
  if (!buyerType) return PERSONA_STYLING.other;
  return PERSONA_STYLING[buyerType] ?? PERSONA_STYLING.other;
}

function buildForwardSignalEmail(
  items: ForwardSignalAlertItem[],
  appUrl: string,
  persona: PersonaStyling,
): string {
  const grouped = new Map<string, ForwardSignalAlertItem[]>();
  for (const it of items) {
    const list = grouped.get(it.cityId) ?? [];
    list.push(it);
    grouped.set(it.cityId, list);
  }

  const sections = Array.from(grouped.entries())
    .map(([cityId, signals]) => {
      const rows = signals
        .map((s) => {
          const color =
            s.direction === "positive" ? "#15803d" : s.direction === "negative" ? "#dc2626" : "#888";
          const sign = s.direction === "positive" ? "+" : s.direction === "negative" ? "-" : "";
          const impact =
            s.pointsIfRealized > 0 ? `<span style="color:${color};font-weight:700;">${sign}${s.pointsIfRealized} pts</span>` : "";
          return `
            <li style="padding:8px 0;color:#333;font-size:13px;line-height:1.6;">
              <div>${s.description}</div>
              <div style="color:#888;font-size:11px;margin-top:2px;">
                ${s.windowLabel} · ${s.confidence} confidence${impact ? ` · ${impact}` : ""}
              </div>
            </li>`;
        })
        .join("");
      const briefingUrl = `${appUrl}/reports/${persona.briefingRoute}/${cityId}`;
      return `
        <div style="margin-bottom:20px;">
          <a href="${briefingUrl}" style="color:#1a1a1a;font-size:16px;font-weight:700;text-decoration:none;border-left:3px solid ${persona.accent};padding-left:10px;">${cityName(cityId)}</a>
          <ul style="margin:6px 0 0;padding-left:28px;list-style:disc;">${rows}</ul>
        </div>`;
    })
    .join("");

  return `
    <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:560px;margin:0 auto;">
      <div style="margin-bottom:32px;border-top:3px solid ${persona.accent};padding-top:20px;">
        <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:${persona.accent};letter-spacing:0.12em;">INDEX</span>
      </div>
      <p style="color:#1a1a1a;font-size:18px;font-weight:700;margin:0 0 8px;">Forward Signal Alert</p>
      <p style="color:#888;font-size:13px;margin:0 0 24px;">${persona.intro}</p>
      ${sections}
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}/dashboard" style="display:inline-block;background:${persona.accent};color:#ffffff;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">${persona.ctaLabel}</a>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:28px 0 16px;" />
      <p style="color:#999;font-size:11px;line-height:1.6;margin:0;">
        Forward signals are derived from the AirIndex pipeline aggregating classifier outputs, market watch trajectory, and pre-development facility milestones. Signal strength reflects classifier confidence, not guaranteed outcome.
      </p>
    </div>
  `.trim();
}

// -------------------------------------------------------
// Main notification runner
// -------------------------------------------------------

export async function sendAlertNotifications(): Promise<{
  scoreAlertsSent: number;
  watchlistAlertsSent: number;
  forwardSignalAlertsSent: number;
}> {
  const appUrl = process.env.APP_URL || "https://www.airindex.io";
  const from = process.env.ALERT_FROM_EMAIL || "AirIndex <alerts@airindex.io>";
  let scoreAlertsSent = 0;
  let watchlistAlertsSent = 0;
  let forwardSignalAlertsSent = 0;

  // Find all users with watchlists who have Alert+ access
  const usersWithWatchlists = await prisma.user.findMany({
    where: {
      watchlist: { isNot: null },
    },
    select: {
      id: true,
      email: true,
      tier: true,
      buyerType: true,
      watchlist: { select: { cityIds: true } },
      billingSubscriptions: {
        where: { status: { in: ["active", "trialing", "past_due"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Filter to Alert+ users
  const alertUsers = usersWithWatchlists.filter((u) => {
    const effectiveTier = u.billingSubscriptions[0]?.tier || u.tier || "free";
    return hasAlertAccess(effectiveTier) && u.watchlist && u.watchlist.cityIds.length > 0;
  });

  if (alertUsers.length === 0) {
    logger.info("[alert-notify] No Alert+ users with watchlists found");
    return { scoreAlertsSent: 0, watchlistAlertsSent: 0, forwardSignalAlertsSent: 0 };
  }

  logger.info(`[alert-notify] Processing ${alertUsers.length} Alert+ users`);

  // Get today's and yesterday's snapshots for comparison
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  const todaySnapshots = await prisma.scoreSnapshot.findMany({
    where: { capturedAt: { gte: new Date(now.toISOString().split("T")[0]) } },
    orderBy: { capturedAt: "desc" },
    distinct: ["cityId"],
    select: { cityId: true, score: true, tier: true },
  });

  const yesterdaySnapshots = await prisma.scoreSnapshot.findMany({
    where: {
      capturedAt: {
        gte: new Date(yesterday.toISOString().split("T")[0]),
        lt: new Date(now.toISOString().split("T")[0]),
      },
    },
    orderBy: { capturedAt: "desc" },
    distinct: ["cityId"],
    select: { cityId: true, score: true },
  });

  const yesterdayMap = new Map(yesterdaySnapshots.map((s) => [s.cityId, s.score]));
  const todayMap = new Map(todaySnapshots.map((s) => [s.cityId, { score: s.score, tier: s.tier }]));

  // Check for new watch list entries (last 24 hours)
  const recentWatchlistEntries = await prisma.watchListEntry.findMany({
    where: { triggeredAt: { gte: yesterday } },
    select: { cityId: true, triggerType: true, triggerDetail: true },
  });

  for (const user of alertUsers) {
    if (!user.email || !user.watchlist) continue;
    const watchedCities = user.watchlist.cityIds;

    // Score changes for watched cities
    const scoreChanges: { cityId: string; oldScore: number; newScore: number; tier: string }[] = [];
    for (const cityId of watchedCities) {
      const today = todayMap.get(cityId);
      const prevScore = yesterdayMap.get(cityId);
      if (today && prevScore !== undefined && today.score !== prevScore) {
        scoreChanges.push({ cityId, oldScore: prevScore, newScore: today.score, tier: today.tier || "" });
      }
    }

    if (scoreChanges.length > 0) {
      try {
        const html = buildScoreChangeEmail(scoreChanges, appUrl);
        await sendSesEmail({
          to: user.email,
          from,
          subject: `[AirIndex] Score change: ${scoreChanges.map((c) => cityName(c.cityId)).join(", ")}`,
          html,
        });
        scoreAlertsSent++;
        logger.info(`[alert-notify] Score change email sent to ${user.email}`);
      } catch (err) {
        logger.error(`[alert-notify] Failed to send score alert to ${user.email}:`, err);
      }
    }

    // Watch list entries for watched cities
    const relevantEntries = recentWatchlistEntries.filter((e) => watchedCities.includes(e.cityId));
    if (relevantEntries.length > 0) {
      try {
        const html = buildWatchlistAlertEmail(relevantEntries, appUrl);
        await sendSesEmail({
          to: user.email,
          from,
          subject: `[AirIndex] Watch list: ${relevantEntries.map((e) => cityName(e.cityId)).join(", ")}`,
          html,
        });
        watchlistAlertsSent++;
        logger.info(`[alert-notify] Watch list email sent to ${user.email}`);
      } catch (err) {
        logger.error(`[alert-notify] Failed to send watchlist alert to ${user.email}:`, err);
      }
    }

    // ── Forward Signal Alerts — proactive predictions for watched markets ──
    // Find PredictionRecord rows for watched cities generated in last 24h,
    // filter to high-confidence + non-neutral direction, exclude any already
    // alerted to this user via ForwardSignalAlert.
    const newPredictions = await prisma.predictionRecord.findMany({
      where: {
        cityId: { in: watchedCities },
        generatedAt: { gte: yesterday },
        confidence: "high",
        predictedDirection: { not: "neutral" },
      },
      orderBy: { generatedAt: "desc" },
    });

    if (newPredictions.length > 0) {
      const alreadyAlerted = await prisma.forwardSignalAlert.findMany({
        where: {
          userId: user.id,
          predictionRecordId: { in: newPredictions.map((p) => p.id) },
        },
        select: { predictionRecordId: true },
      });
      const alertedIds = new Set(alreadyAlerted.map((a) => a.predictionRecordId));
      const fresh = newPredictions.filter((p) => !alertedIds.has(p.id));

      if (fresh.length > 0) {
        const items: ForwardSignalAlertItem[] = fresh.map((p) => ({
          predictionId: p.id,
          cityId: p.cityId,
          description: p.description,
          windowLabel: p.windowLabel,
          confidence: p.confidence,
          direction: p.predictedDirection,
          pointsIfRealized: p.predictedDelta,
          factor: p.predictedFactor,
        }));

        try {
          const persona = getPersonaStyling(user.buyerType);
          const html = buildForwardSignalEmail(items, appUrl, persona);
          const citiesList = Array.from(new Set(items.map((i) => cityName(i.cityId)))).join(", ");
          await sendSesEmail({
            to: user.email,
            from,
            subject: `[AirIndex] Forward signals: ${citiesList}`,
            html,
          });
          forwardSignalAlertsSent++;
          logger.info(`[alert-notify] Forward signal email sent to ${user.email} (${fresh.length} signals)`);

          // Record as sent so we don't re-alert on subsequent cron runs
          await prisma.forwardSignalAlert.createMany({
            data: fresh.map((p) => ({
              userId: user.id,
              cityId: p.cityId,
              predictionRecordId: p.id,
            })),
            skipDuplicates: true,
          });
        } catch (err) {
          logger.error(`[alert-notify] Failed to send forward signal alert to ${user.email}:`, err);
        }
      }
    }
  }

  return { scoreAlertsSent, watchlistAlertsSent, forwardSignalAlertsSent };
}

// -------------------------------------------------------
// Monthly summary sender
// -------------------------------------------------------

export async function sendMonthlySummaries(): Promise<number> {
  const appUrl = process.env.APP_URL || "https://www.airindex.io";
  const from = process.env.ALERT_FROM_EMAIL || "AirIndex <alerts@airindex.io>";
  let sent = 0;

  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const usersWithWatchlists = await prisma.user.findMany({
    where: {
      watchlist: { isNot: null },
    },
    select: {
      id: true,
      email: true,
      tier: true,
      watchlist: { select: { cityIds: true } },
      billingSubscriptions: {
        where: { status: { in: ["active", "trialing", "past_due"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const alertUsers = usersWithWatchlists.filter((u) => {
    const effectiveTier = u.billingSubscriptions[0]?.tier || u.tier || "free";
    return hasAlertAccess(effectiveTier) && u.watchlist && u.watchlist.cityIds.length > 0;
  });

  // Get current scores and 30-day-ago scores
  const currentSnapshots = await prisma.scoreSnapshot.findMany({
    orderBy: { capturedAt: "desc" },
    distinct: ["cityId"],
    select: { cityId: true, score: true, tier: true },
  });

  const oldSnapshots = await prisma.scoreSnapshot.findMany({
    where: { capturedAt: { lte: thirtyDaysAgo } },
    orderBy: { capturedAt: "desc" },
    distinct: ["cityId"],
    select: { cityId: true, score: true },
  });

  const currentMap = new Map(currentSnapshots.map((s) => [s.cityId, { score: s.score, tier: s.tier || "" }]));
  const oldMap = new Map(oldSnapshots.map((s) => [s.cityId, s.score]));

  for (const user of alertUsers) {
    if (!user.email || !user.watchlist) continue;

    const markets = user.watchlist.cityIds
      .map((cityId) => {
        const current = currentMap.get(cityId);
        if (!current) return null;
        const oldScore = oldMap.get(cityId);
        return {
          cityId,
          score: current.score,
          tier: current.tier,
          delta: oldScore !== undefined ? current.score - oldScore : null,
        };
      })
      .filter(Boolean) as { cityId: string; score: number; tier: string; delta: number | null }[];

    if (markets.length === 0) continue;

    try {
      const html = buildMonthlySummaryEmail(markets, monthName, appUrl);
      await sendSesEmail({
        to: user.email,
        from,
        subject: `[AirIndex] Monthly Summary — ${monthName}`,
        html,
      });
      sent++;
      logger.info(`[alert-notify] Monthly summary sent to ${user.email}`);
    } catch (err) {
      logger.error(`[alert-notify] Failed to send monthly summary to ${user.email}:`, err);
    }
  }

  return sent;
}
