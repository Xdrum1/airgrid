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
// Main notification runner
// -------------------------------------------------------

export async function sendAlertNotifications(): Promise<{
  scoreAlertsSent: number;
  watchlistAlertsSent: number;
}> {
  const appUrl = process.env.APP_URL || "https://www.airindex.io";
  const from = process.env.ALERT_FROM_EMAIL || "AirIndex <alerts@airindex.io>";
  let scoreAlertsSent = 0;
  let watchlistAlertsSent = 0;

  // Find all users with watchlists who have Alert+ access
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

  // Filter to Alert+ users
  const alertUsers = usersWithWatchlists.filter((u) => {
    const effectiveTier = u.billingSubscriptions[0]?.tier || u.tier || "free";
    return hasAlertAccess(effectiveTier) && u.watchlist && u.watchlist.cityIds.length > 0;
  });

  if (alertUsers.length === 0) {
    logger.info("[alert-notify] No Alert+ users with watchlists found");
    return { scoreAlertsSent: 0, watchlistAlertsSent: 0 };
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
  }

  return { scoreAlertsSent, watchlistAlertsSent };
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
