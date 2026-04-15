/**
 * Briefing follow-up drip — cron-triggered.
 *
 * Finds unopened briefing sends 5-10 days old and fires a follow-up
 * email with a fresh-data angle: what's changed in that market since
 * the original send (forward signals, score deltas, new precedents).
 *
 * Unopened = no NewsletterEvent with event='click' and series='briefing_<persona>'
 * matching the recipient's email since the original sentAt.
 *
 * Only fires once per BriefingSend (followUpSentAt idempotent guard).
 * Admins can skip individual sends via BriefingSend.followUpSkipped.
 *
 * Auth: CRON_SECRET via Bearer.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/admin-helpers";
import { prisma } from "@/lib/prisma";
import { sendSesEmail } from "@/lib/ses";
import { buildClickTrackUrl } from "@/lib/newsletter-token";
import { getForwardSignals } from "@/lib/forward-signals";
import { getScoreTrajectory } from "@/lib/score-history";
import { CITIES } from "@/data/seed";

const FROM = "AirIndex <hello@airindex.io>";

const PERSONA_ACCENT: Record<string, string> = {
  infrastructure: "#00d4ff",
  municipality: "#5B8DB8",
  insurance: "#b45309",
  operator: "#7c3aed",
  investor: "#0369a1",
};

const PERSONA_LABEL: Record<string, string> = {
  infrastructure: "Infrastructure Briefing",
  municipality: "Municipality Briefing",
  insurance: "Insurance Briefing",
  operator: "Operator Market-Entry Briefing",
  investor: "Investor Briefing",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

async function buildChangeSummary(cityId: string, sinceDate: Date): Promise<string[]> {
  const lines: string[] = [];

  // 1. Score trajectory since sentAt
  try {
    const daysSince = Math.max(
      3,
      Math.floor((Date.now() - sinceDate.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const traj = await getScoreTrajectory(cityId, { sinceDaysAgo: daysSince });
    if (traj.points.length >= 2) {
      const first = traj.points[0];
      const last = traj.points[traj.points.length - 1];
      if (first && last && first.score !== last.score) {
        const delta = last.score - first.score;
        const sign = delta > 0 ? "+" : "";
        lines.push(
          `Score moved ${first.score} → ${last.score} (${sign}${delta}) since the original briefing was sent`,
        );
      }
    }
  } catch {
    // trajectory unavailable — skip
  }

  // 2. New forward signals (classified after sentAt)
  try {
    const fs = await getForwardSignals(cityId);
    const newNear = fs.near.filter(
      (s) => s.classifiedAt && s.classifiedAt > sinceDate && s.confidence === "high",
    );
    if (newNear.length > 0) {
      const top = newNear.slice(0, 3);
      for (const sig of top) {
        const impact =
          sig.scoreImpact.direction !== "neutral" && sig.scoreImpact.pointsIfRealized > 0
            ? ` (projected ${sig.scoreImpact.direction === "positive" ? "+" : "-"}${sig.scoreImpact.pointsIfRealized} pts)`
            : "";
        lines.push(`${sig.description}${impact}`);
      }
    }
    if (fs.marketWatch && fs.marketWatch.setAt > sinceDate) {
      lines.push(
        `Market watch status: ${fs.marketWatch.status.replace(/_/g, " ").toLowerCase()} / ${fs.marketWatch.outlook.toLowerCase()}`,
      );
    }
  } catch {
    // forward signals unavailable — skip
  }

  return lines;
}

function buildFollowUpEmail(params: {
  recipientName: string | null;
  persona: string;
  cityName: string;
  cityState: string;
  originalSentAt: Date;
  briefingUrl: string;
  changeSummary: string[];
}): string {
  const accent = PERSONA_ACCENT[params.persona] ?? "#0077aa";
  const label = PERSONA_LABEL[params.persona] ?? "AirIndex Briefing";
  const greeting = params.recipientName ? `Hi ${params.recipientName},` : "Hi,";

  const summary =
    params.changeSummary.length > 0
      ? `<ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.8;color:#333;">
           ${params.changeSummary.map((l) => `<li>${l}</li>`).join("")}
         </ul>`
      : `<p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 20px;">
           The underlying signal stream for ${params.cityName} has continued to accumulate since then — worth a fresh look.
         </p>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Follow-up: ${label} for ${params.cityName}</title></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;">
        <tr><td style="padding:36px 40px 20px;border-top:3px solid ${accent};">
          <div style="font:700 11px/1 'Courier New',monospace;color:${accent};letter-spacing:0.15em;text-transform:uppercase;">
            AIRINDEX · ${label.toUpperCase()} · FOLLOW-UP
          </div>
          <h1 style="font:700 22px/1.3 'Helvetica Neue',Arial,sans-serif;color:#111;margin:14px 0 0;">
            ${params.cityName}, ${params.cityState} — what's changed
          </h1>
        </td></tr>

        <tr><td style="padding:8px 40px 0;">
          <p style="font:15px/1.7 'Helvetica Neue',Arial,sans-serif;color:#333;margin:0 0 18px;">
            ${greeting}
          </p>
          <p style="font:14px/1.7 'Helvetica Neue',Arial,sans-serif;color:#555;margin:0 0 16px;">
            Following up on the ${label.toLowerCase()} we shared for ${params.cityName} on ${formatDate(params.originalSentAt)}. Here's what the platform has surfaced since then:
          </p>
          ${summary}
        </td></tr>

        <tr><td style="padding:0 40px 16px;">
          <a href="${params.briefingUrl}" style="display:inline-block;padding:12px 24px;background:${accent};color:#ffffff;text-decoration:none;border-radius:6px;font:700 13px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:0.05em;">
            View Updated ${label} →
          </a>
        </td></tr>

        <tr><td style="padding:24px 40px 0;border-top:1px solid #eee;">
          <p style="font:12px/1.7 'Helvetica Neue',Arial,sans-serif;color:#888;margin:0 0 8px;">
            Reply directly or reach <a href="mailto:sales@airindex.io" style="color:${accent};text-decoration:none;">sales@airindex.io</a> to discuss scope.
          </p>
        </td></tr>

        <tr><td style="padding:20px 40px 36px;">
          <p style="font:11px/1.6 'Helvetica Neue',Arial,sans-serif;color:#aaa;margin:0;">
            Vertical Data Group, LLC · AirIndex · airindex.io<br>
            Confidential and for the addressed recipient only. Auto-follow-up triggered because the original briefing link wasn't visited.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  try {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 86400000);

    // Candidate sends: 5-10 days old, no follow-up fired, not manually skipped
    const candidates = await prisma.briefingSend.findMany({
      where: {
        sentAt: { lte: fiveDaysAgo, gte: tenDaysAgo },
        followUpSentAt: null,
        followUpSkipped: false,
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, candidates: 0, sent: 0 });
    }

    // For each candidate, check if recipient clicked on the briefing URL
    // via NewsletterEvent (series='briefing_<persona>', event='click', email match, createdAt >= sentAt)
    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const send of candidates) {
      const openedClick = await prisma.newsletterEvent.findFirst({
        where: {
          email: send.recipientEmail,
          series: `briefing_${send.persona}`,
          event: "click",
          createdAt: { gte: send.sentAt },
        },
        select: { id: true },
      });

      if (openedClick) {
        // Opened — no follow-up needed. Mark as followUpSkipped so we
        // don't re-check forever.
        await prisma.briefingSend.update({
          where: { id: send.id },
          data: { followUpSkipped: true },
        });
        skipped++;
        continue;
      }

      // Build change summary and fire follow-up
      const city = CITIES.find((c) => c.id === send.cityId);
      if (!city) {
        errors.push(`${send.id}: city ${send.cityId} not found`);
        continue;
      }

      try {
        const changeSummary = await buildChangeSummary(send.cityId, send.sentAt);
        const trackedUrl = buildClickTrackUrl(
          send.recipientEmail,
          0,
          send.briefingUrl,
          `briefing_${send.persona}`,
        );
        const label = PERSONA_LABEL[send.persona] ?? "Briefing";
        const html = buildFollowUpEmail({
          recipientName: send.recipientName,
          persona: send.persona,
          cityName: city.city,
          cityState: city.state,
          originalSentAt: send.sentAt,
          briefingUrl: trackedUrl,
          changeSummary,
        });

        await sendSesEmail({
          to: send.recipientEmail,
          from: FROM,
          subject: `Follow-up — ${label} for ${city.city}, ${city.state}`,
          html,
        });

        await prisma.briefingSend.update({
          where: { id: send.id },
          data: { followUpSentAt: new Date() },
        });
        sent++;
      } catch (err) {
        errors.push(`${send.id}: ${(err as Error).message ?? err}`);
      }
    }

    return NextResponse.json({
      success: true,
      candidates: candidates.length,
      sent,
      skipped, // already-opened briefings, auto-marked followUpSkipped
      errors,
    });
  } catch (err) {
    console.error("[briefing-follow-up] Error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message ?? "Follow-up failed" },
      { status: 500 },
    );
  }
}
