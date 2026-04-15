import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSesEmail } from "@/lib/ses";
import { authorizeCron } from "@/lib/admin-helpers";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "alan@airindex.io";
const FROM = "AirIndex Pipeline <hello@airindex.io>";

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

    // 1. Latest ingestion run
    const latestRun = await prisma.ingestionRun.findFirst({
      where: { startedAt: { gte: since } },
      orderBy: { startedAt: "desc" },
    });

    // 2. Score changes — compare latest two snapshots per city
    const scoreChanges = await prisma.$queryRaw<{
      cityId: string;
      oldScore: number;
      newScore: number;
      oldTier: string;
      newTier: string;
      capturedAt: Date;
    }[]>`
      WITH ranked AS (
        SELECT "cityId", score, tier, "capturedAt",
          ROW_NUMBER() OVER (PARTITION BY "cityId" ORDER BY "capturedAt" DESC) as rn
        FROM "ScoreSnapshot"
        WHERE "capturedAt" >= ${since}
      )
      SELECT
        r1."cityId",
        r2.score::int as "oldScore",
        r1.score::int as "newScore",
        r2.tier as "oldTier",
        r1.tier as "newTier",
        r1."capturedAt"
      FROM ranked r1
      JOIN "ScoreSnapshot" r2 ON r2."cityId" = r1."cityId"
        AND r2."capturedAt" = (
          SELECT MAX("capturedAt") FROM "ScoreSnapshot"
          WHERE "cityId" = r1."cityId" AND "capturedAt" < r1."capturedAt"
        )
      WHERE r1.rn = 1 AND r1.score != r2.score
      ORDER BY ABS(r1.score - r2.score) DESC
    `;

    // 3. New classifications (last 24h)
    const classifications = await prisma.classificationResult.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 4. Override candidates created (last 24h)
    const overrides = await prisma.scoringOverride.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 5. New user signups / access requests (last 24h)
    const newUsers = await prisma.user.count({
      where: { createdAt: { gte: since } },
    });
    const newAccessRequests = await prisma.contactInquiry.count({
      where: { createdAt: { gte: since } },
    });

    // 6. Login events (last 24h)
    const logins = await prisma.loginEvent.count({
      where: { createdAt: { gte: since } },
    });

    // 7. New high-confidence forward signals (last 24h) — predictive wins that
    //    fired but haven't yet moved scores. The client-facing alert goes to
    //    Alert+ subscribers; this section tells Alan which predictions drove
    //    those alerts.
    const newPredictions = await prisma.predictionRecord.findMany({
      where: {
        generatedAt: { gte: since },
        confidence: "high",
        predictedDirection: { not: "neutral" },
      },
      orderBy: { generatedAt: "desc" },
      take: 10,
    });

    // 8. Briefing views (last 24h) — which licensed clients opened which
    //    persona briefings. Tracks engagement without dashboard-checking.
    const briefingViews = await prisma.userEvent.findMany({
      where: {
        entityType: "briefing",
        event: "page_view",
        createdAt: { gte: since },
      },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // 9. Forward-signal alerts sent to Alert+ subscribers (last 24h) — did
    //    any clients get auto-alerted about watched-market predictions?
    const alertsSent = await prisma.forwardSignalAlert.findMany({
      where: { sentAt: { gte: since } },
      take: 10,
    });
    const alertsSentCount = alertsSent.length;
    const alertedUserCount = new Set(alertsSent.map((a) => a.userId)).size;

    // Build email
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const hasActivity = scoreChanges.length > 0 ||
      classifications.length > 0 ||
      overrides.length > 0 ||
      newUsers > 0 ||
      newAccessRequests > 0 ||
      newPredictions.length > 0 ||
      briefingViews.length > 0 ||
      alertsSentCount > 0;

    // Score changes section
    const scoreSection = scoreChanges.length > 0
      ? `<h3 style="color:#111;font-size:15px;margin:24px 0 12px;">Score Changes</h3>
         <table style="width:100%;border-collapse:collapse;font-size:13px;">
           <tr style="border-bottom:2px solid #5B8DB8;">
             <th style="text-align:left;padding:6px 8px;color:#555;">City</th>
             <th style="text-align:center;padding:6px 8px;color:#555;">Previous</th>
             <th style="text-align:center;padding:6px 8px;color:#555;">Current</th>
             <th style="text-align:center;padding:6px 8px;color:#555;">Change</th>
           </tr>
           ${scoreChanges.map((s) => {
             const delta = s.newScore - s.oldScore;
             const color = delta > 0 ? "#16a34a" : delta < 0 ? "#dc2626" : "#888";
             const arrow = delta > 0 ? "&#9650;" : delta < 0 ? "&#9660;" : "";
             return `<tr style="border-bottom:1px solid #eee;">
               <td style="padding:6px 8px;font-weight:600;">${s.cityId}</td>
               <td style="padding:6px 8px;text-align:center;color:#888;">${s.oldScore} (${s.oldTier})</td>
               <td style="padding:6px 8px;text-align:center;font-weight:600;">${s.newScore} (${s.newTier})</td>
               <td style="padding:6px 8px;text-align:center;color:${color};font-weight:700;">${arrow} ${delta > 0 ? "+" : ""}${delta}</td>
             </tr>`;
           }).join("")}
         </table>`
      : `<p style="color:#888;font-size:13px;margin:16px 0;">No score changes in the last 24 hours.</p>`;

    // Classifications section
    const classSection = classifications.length > 0
      ? `<h3 style="color:#111;font-size:15px;margin:24px 0 12px;">Classifications (${classifications.length})</h3>
         <table style="width:100%;border-collapse:collapse;font-size:12px;">
           ${classifications.slice(0, 10).map((c) => {
             const color = c.eventType === "not_relevant" ? "#999"
               : c.eventType.includes("failed") ? "#dc2626"
               : "#111";
             return `<tr style="border-bottom:1px solid #f0f0f0;">
               <td style="padding:4px 8px;color:${color};font-weight:600;white-space:nowrap;">${c.eventType}</td>
               <td style="padding:4px 8px;color:#888;">${c.confidence}</td>
               <td style="padding:4px 8px;color:#555;">${c.affectedCities.join(", ") || "—"}</td>
             </tr>`;
           }).join("")}
         </table>
         ${classifications.length > 10 ? `<p style="color:#888;font-size:11px;">+ ${classifications.length - 10} more</p>` : ""}`
      : "";

    // Overrides section
    const overrideSection = overrides.length > 0
      ? `<h3 style="color:#111;font-size:15px;margin:24px 0 12px;">Override Candidates (${overrides.length})</h3>
         <table style="width:100%;border-collapse:collapse;font-size:12px;">
           ${overrides.slice(0, 10).map((o) => {
             const conf = o.confidence === "high" ? "#16a34a" : o.confidence === "medium" ? "#f59e0b" : "#dc2626";
             return `<tr style="border-bottom:1px solid #f0f0f0;">
               <td style="padding:4px 8px;font-weight:600;">${o.cityId}</td>
               <td style="padding:4px 8px;color:#555;">${o.field}</td>
               <td style="padding:4px 8px;color:${conf};font-weight:600;">${o.confidence}</td>
               <td style="padding:4px 8px;color:#888;font-size:11px;">${o.reason?.slice(0, 80) ?? ""}...</td>
             </tr>`;
           }).join("")}
         </table>`
      : "";

    // Pipeline section
    const pipelineSection = latestRun
      ? `<h3 style="color:#111;font-size:15px;margin:24px 0 12px;">Pipeline</h3>
         <table style="font-size:13px;border-collapse:collapse;">
           <tr><td style="padding:3px 12px 3px 0;color:#888;">Status</td><td style="padding:3px 0;font-weight:600;color:${latestRun.error ? "#dc2626" : "#16a34a"};">${latestRun.error ? "FAILED" : "OK"}</td></tr>
           <tr><td style="padding:3px 12px 3px 0;color:#888;">New records</td><td style="padding:3px 0;">${latestRun.newRecords}</td></tr>
           <tr><td style="padding:3px 12px 3px 0;color:#888;">Updated records</td><td style="padding:3px 0;">${latestRun.updatedRecords}</td></tr>
           <tr><td style="padding:3px 12px 3px 0;color:#888;">Overrides created</td><td style="padding:3px 0;">${latestRun.overridesCreated}</td></tr>
           <tr><td style="padding:3px 12px 3px 0;color:#888;">Score changes</td><td style="padding:3px 0;">${latestRun.scoreChanges}</td></tr>
           <tr><td style="padding:3px 12px 3px 0;color:#888;">Sources</td><td style="padding:3px 0;">${latestRun.sources.join(", ")}</td></tr>
           ${latestRun.error ? `<tr><td style="padding:3px 12px 3px 0;color:#dc2626;">Error</td><td style="padding:3px 0;color:#dc2626;">${latestRun.error}</td></tr>` : ""}
         </table>`
      : `<p style="color:#dc2626;font-size:13px;margin:16px 0;">No ingestion run detected in the last 24 hours.</p>`;

    // Forward signals section — high-confidence predictions fired in 24h
    const forwardSignalsSection = newPredictions.length > 0
      ? `<h3 style="color:#111;font-size:15px;margin:24px 0 12px;">Forward Signals Fired (${newPredictions.length})</h3>
         <table style="width:100%;border-collapse:collapse;font-size:12px;">
           ${newPredictions.map((p) => {
             const color = p.predictedDirection === "positive" ? "#16a34a" : p.predictedDirection === "negative" ? "#dc2626" : "#888";
             const sign = p.predictedDirection === "positive" ? "+" : p.predictedDirection === "negative" ? "-" : "";
             const impact = p.predictedDelta > 0 ? `${sign}${p.predictedDelta} pts` : "—";
             return `<tr style="border-bottom:1px solid #f0f0f0;">
               <td style="padding:4px 8px;font-weight:600;white-space:nowrap;">${p.cityId}</td>
               <td style="padding:4px 8px;color:${color};font-weight:700;">${impact}</td>
               <td style="padding:4px 8px;color:#555;">${p.windowLabel}</td>
               <td style="padding:4px 8px;color:#888;font-size:11px;">${p.description.slice(0, 90)}</td>
             </tr>`;
           }).join("")}
         </table>`
      : "";

    // Briefing views section — who opened which persona briefings
    const briefingViewsSection = briefingViews.length > 0
      ? `<h3 style="color:#111;font-size:15px;margin:24px 0 12px;">Briefing Views (${briefingViews.length})</h3>
         <table style="width:100%;border-collapse:collapse;font-size:12px;">
           ${briefingViews.map((v) => {
             const viewer = v.user
               ? [v.user.firstName, v.user.lastName].filter(Boolean).join(" ") || v.user.email || "—"
               : "—";
             return `<tr style="border-bottom:1px solid #f0f0f0;">
               <td style="padding:4px 8px;font-weight:600;color:#5B8DB8;">${v.entityId ?? "—"}</td>
               <td style="padding:4px 8px;color:#555;">${viewer}</td>
               <td style="padding:4px 8px;color:#888;font-size:11px;text-align:right;">${v.createdAt.toISOString().slice(11, 16)} UTC</td>
             </tr>`;
           }).join("")}
         </table>`
      : "";

    // Alert sends section — forward-signal alerts to Alert+ clients
    const alertSendsSection = alertsSentCount > 0
      ? `<h3 style="color:#111;font-size:15px;margin:24px 0 12px;">Forward-Signal Alerts Sent</h3>
         <p style="color:#555;font-size:13px;margin:0;">${alertsSentCount} alert${alertsSentCount === 1 ? "" : "s"} auto-delivered to ${alertedUserCount} Alert+ ${alertedUserCount === 1 ? "client" : "clients"} for watched-market predictions fired in last 24h.</p>`
      : "";

    // Platform activity section
    const activitySection = (newUsers > 0 || newAccessRequests > 0 || logins > 0)
      ? `<h3 style="color:#111;font-size:15px;margin:24px 0 12px;">Platform Activity</h3>
         <table style="font-size:13px;border-collapse:collapse;">
           ${logins > 0 ? `<tr><td style="padding:3px 12px 3px 0;color:#888;">Logins</td><td style="padding:3px 0;">${logins}</td></tr>` : ""}
           ${newUsers > 0 ? `<tr><td style="padding:3px 12px 3px 0;color:#888;">New users</td><td style="padding:3px 0;color:#16a34a;font-weight:600;">${newUsers}</td></tr>` : ""}
           ${newAccessRequests > 0 ? `<tr><td style="padding:3px 12px 3px 0;color:#888;">Access requests</td><td style="padding:3px 0;color:#5B8DB8;font-weight:600;">${newAccessRequests}</td></tr>` : ""}
         </table>`
      : "";

    const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
      <!-- Header -->
      <div style="background:#050508;padding:20px 28px;">
        <span style="color:#5B8DB8;font-size:10px;font-weight:700;letter-spacing:0.12em;">AIRINDEX MORNING BRIEFING</span>
        <div style="color:#fff;font-size:18px;font-weight:700;margin-top:8px;font-family:'Helvetica Neue',Arial,sans-serif;">${today}</div>
      </div>
      <!-- Body -->
      <div style="padding:20px 28px 28px;">
        ${!hasActivity && !latestRun?.error
          ? `<p style="color:#888;font-size:14px;margin:16px 0;">Quiet day. No score changes, no new classifications, no platform signups.</p>`
          : ""}
        ${scoreSection}
        ${forwardSignalsSection}
        ${alertSendsSection}
        ${classSection}
        ${overrideSection}
        ${briefingViewsSection}
        ${pipelineSection}
        ${activitySection}
      </div>
      <!-- Footer -->
      <div style="padding:16px 28px;border-top:1px solid #f0f0f0;font-size:11px;color:#999;">
        AirIndex &middot; Vertical Data Group, LLC &middot; airindex.io
      </div>
    </div>
  </div>
</body></html>`;

    // Send
    await sendSesEmail({
      to: ADMIN_EMAIL,
      from: FROM,
      subject: `AirIndex Briefing — ${scoreChanges.length > 0 ? `${scoreChanges.length} score change${scoreChanges.length > 1 ? "s" : ""}` : "No score changes"} | ${classifications.length} classifications | ${logins} logins`,
      html,
    });

    return NextResponse.json({
      success: true,
      summary: {
        scoreChanges: scoreChanges.length,
        classifications: classifications.length,
        overrides: overrides.length,
        newUsers,
        accessRequests: newAccessRequests,
        logins,
        pipelineStatus: latestRun ? (latestRun.error ? "failed" : "ok") : "no_run",
      },
    });
  } catch (err) {
    console.error("[morning-briefing] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
