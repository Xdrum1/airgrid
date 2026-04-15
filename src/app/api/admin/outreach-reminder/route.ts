/**
 * Daily outreach reminder — emails Alan which outreach contacts need
 * follow-up action, so no BD thread drops because he forgot to ping.
 *
 * Fires via GitHub Actions. Checks OutreachContact rows and emails a
 * digest when any are:
 *   - Awaiting reply 7+ days with no follow-up sent
 *   - Follow-up sent 7+ days ago with still no reply (second nudge or close-out)
 *   - Awaiting reply 21+ days — probably ghosted; suggest closing
 *
 * Does NOT auto-send follow-up content (editorial judgment required).
 * Does update lastReminderAt so Alan isn't pinged daily about the same row.
 *
 * Auth: CRON_SECRET via Bearer.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/admin-helpers";
import { prisma } from "@/lib/prisma";
import { sendSesEmail } from "@/lib/ses";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "alan@airindex.io";
const FROM = "AirIndex Pipeline <hello@airindex.io>";

interface Bucket {
  label: string;
  color: string;
  rows: {
    name: string;
    email: string;
    org: string | null;
    daysSinceSent: number;
    subject: string;
    note: string | null;
  }[];
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);

    // Only look at open outreach
    const open = await prisma.outreachContact.findMany({
      where: {
        status: "awaiting_reply",
        closedAt: null,
      },
      orderBy: { firstEmailSentAt: "asc" },
    });

    const needsFollowUp: Bucket = {
      label: "Needs follow-up (7+ days, no reply, no follow-up yet)",
      color: "#b45309",
      rows: [],
    };
    const followUpStale: Bucket = {
      label: "Follow-up sent, still no reply (second nudge or close?)",
      color: "#f59e0b",
      rows: [],
    };
    const likelyGhosted: Bucket = {
      label: "21+ days no reply — probably ghosted, suggest closing",
      color: "#dc2626",
      rows: [],
    };

    const reminderIds: string[] = [];

    for (const row of open) {
      const daysSinceSent = daysBetween(now, row.firstEmailSentAt);

      // Skip if we've already pinged Alan about this row within 24h
      if (row.lastReminderAt && row.lastReminderAt > yesterday) continue;

      const entry = {
        name: row.name,
        email: row.email,
        org: row.org,
        daysSinceSent,
        subject: row.firstEmailSubject,
        note: row.manualNote,
      };

      if (daysSinceSent >= 21) {
        likelyGhosted.rows.push(entry);
        reminderIds.push(row.id);
      } else if (row.followUpSentAt && daysBetween(now, row.followUpSentAt) >= 7) {
        followUpStale.rows.push(entry);
        reminderIds.push(row.id);
      } else if (daysSinceSent >= 7 && !row.followUpSentAt) {
        needsFollowUp.rows.push(entry);
        reminderIds.push(row.id);
      }
    }

    const totalPending = needsFollowUp.rows.length + followUpStale.rows.length + likelyGhosted.rows.length;

    if (totalPending === 0) {
      return NextResponse.json({
        success: true,
        pending: 0,
        message: "No outreach follow-ups due",
      });
    }

    const renderBucket = (b: Bucket): string => {
      if (b.rows.length === 0) return "";
      return `
        <h3 style="color:${b.color};font-size:14px;font-weight:700;margin:20px 0 10px;border-left:3px solid ${b.color};padding-left:10px;">
          ${b.label} (${b.rows.length})
        </h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          ${b.rows
            .map(
              (r) => `
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:8px 10px;vertical-align:top;">
                <div style="font-weight:700;color:#111;">${r.name}</div>
                <div style="color:#666;font-size:11px;">${r.email}${r.org ? ` · ${r.org}` : ""}</div>
                ${r.note ? `<div style="color:#888;font-size:11px;margin-top:3px;font-style:italic;">${r.note}</div>` : ""}
              </td>
              <td style="padding:8px 10px;text-align:right;vertical-align:top;white-space:nowrap;color:#555;">
                <div><strong>${r.daysSinceSent}d</strong> since sent</div>
                <div style="color:#888;font-size:11px;margin-top:3px;">${r.subject.slice(0, 60)}${r.subject.length > 60 ? "…" : ""}</div>
              </td>
            </tr>`,
            )
            .join("")}
        </table>`;
    };

    const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#050508;padding:20px 28px;">
        <span style="color:#5B8DB8;font-size:10px;font-weight:700;letter-spacing:0.12em;">AIRINDEX PIPELINE · OUTREACH REMINDER</span>
        <div style="color:#fff;font-size:18px;font-weight:700;margin-top:8px;">${totalPending} outreach ${totalPending === 1 ? "contact" : "contacts"} pending your action</div>
      </div>
      <div style="padding:20px 28px 28px;">
        <p style="color:#555;font-size:13px;margin:0 0 8px;">
          Automated nudge so no BD thread drops. Action on each is yours — reply, send a follow-up, or close the row via
          <code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:11px;">npx tsx scripts/log-outreach.ts --mark-replied --email &lt;e&gt;</code>
          or <code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:11px;">--close --email &lt;e&gt; --status declined|ghosted</code>.
        </p>
        ${renderBucket(needsFollowUp)}
        ${renderBucket(followUpStale)}
        ${renderBucket(likelyGhosted)}
      </div>
      <div style="padding:14px 28px;border-top:1px solid #f0f0f0;font-size:11px;color:#999;">
        AirIndex Pipeline · Vertical Data Group, LLC · Outreach reminder cron (daily 13:00 UTC)
      </div>
    </div>
  </div>
</body></html>`;

    await sendSesEmail({
      to: ADMIN_EMAIL,
      from: FROM,
      subject: `[Outreach] ${totalPending} contact${totalPending === 1 ? "" : "s"} pending follow-up`,
      html,
    });

    // Mark all pinged rows so we don't re-alert within 24h
    if (reminderIds.length > 0) {
      await prisma.outreachContact.updateMany({
        where: { id: { in: reminderIds } },
        data: { lastReminderAt: now },
      });
    }

    return NextResponse.json({
      success: true,
      pending: totalPending,
      needsFollowUp: needsFollowUp.rows.length,
      followUpStale: followUpStale.rows.length,
      likelyGhosted: likelyGhosted.rows.length,
    });
  } catch (err) {
    console.error("[outreach-reminder] Error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message ?? "Reminder failed" },
      { status: 500 },
    );
  }
}
