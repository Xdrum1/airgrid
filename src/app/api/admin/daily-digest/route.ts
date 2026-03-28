import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSesEmail } from "@/lib/ses";
import { authorizeCron } from "@/lib/admin-helpers";
import { createLogger } from "@/lib/logger";

const logger = createLogger("daily-digest");

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ error: "ADMIN_NOTIFY_EMAIL not configured" }, { status: 500 });
  }

  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Gather data in parallel
    const [
      totalUsers,
      newUsers,
      activeUsers,
      eventCounts,
      topCities,
      topTabs,
      recentInquiries,
      allUsers,
    ] = await Promise.all([
      // Total user count
      prisma.user.count(),

      // New signups in last 24h
      prisma.user.findMany({
        where: { createdAt: { gte: yesterday } },
        select: { email: true, createdAt: true, organization: true, jobTitle: true },
        orderBy: { createdAt: "desc" },
      }),

      // Users active in last 24h
      prisma.user.findMany({
        where: { lastActiveAt: { gte: yesterday } },
        select: { email: true, lastActiveAt: true, tier: true, organization: true },
        orderBy: { lastActiveAt: "desc" },
      }),

      // Event counts by type in last 24h
      prisma.userEvent.groupBy({
        by: ["event"],
        where: { createdAt: { gte: yesterday } },
        _count: true,
        orderBy: { _count: { event: "desc" } },
      }),

      // Most viewed cities in last 24h
      prisma.userEvent.groupBy({
        by: ["entityId"],
        where: {
          createdAt: { gte: yesterday },
          event: "city_detail",
          entityId: { not: null },
        },
        _count: true,
        orderBy: { _count: { entityId: "desc" } },
        take: 5,
      }),

      // Tab switches in last 24h
      prisma.userEvent.groupBy({
        by: ["entityId"],
        where: {
          createdAt: { gte: yesterday },
          event: "tab_switch",
          entityId: { not: null },
        },
        _count: true,
        orderBy: { _count: { entityId: "desc" } },
        take: 7,
      }),

      // Contact/access requests in last 24h
      prisma.contactInquiry.findMany({
        where: { createdAt: { gte: yesterday } },
        select: { name: true, email: true, tier: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),

      // All users with last active for "dormant" detection
      prisma.user.findMany({
        select: { email: true, lastActiveAt: true, tier: true, createdAt: true },
        orderBy: { lastActiveAt: { sort: "desc", nulls: "last" } },
      }),
    ]);

    const totalEvents = eventCounts.reduce((sum, e) => sum + e._count, 0);

    // Build email
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const hasActivity = totalEvents > 0 || newUsers.length > 0 || recentInquiries.length > 0;

    let html = `
      <div style="background:#ffffff;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;padding:40px 32px;max-width:600px;margin:0 auto;">
        <div style="margin-bottom:24px;">
          <span style="font-family:'Courier New',monospace;font-weight:800;font-size:15px;color:#0a0a1a;letter-spacing:0.12em;">AIR</span><span style="font-family:'Courier New',monospace;font-weight:400;font-size:15px;color:#0077aa;letter-spacing:0.12em;">INDEX</span>
          <span style="color:#999;font-size:11px;margin-left:8px;">DAILY DIGEST</span>
        </div>
        <p style="color:#333;font-size:14px;margin:0 0 24px;">${dateStr}</p>
    `;

    if (!hasActivity) {
      html += `<p style="color:#999;font-size:14px;padding:24px 0;text-align:center;">No user activity in the last 24 hours.</p>`;
    }

    // Summary stats
    html += `
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:12px 16px;background:#f8f9fa;border-radius:6px 0 0 6px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#333;">${totalUsers}</div>
            <div style="font-size:10px;color:#999;letter-spacing:1px;">TOTAL USERS</div>
          </td>
          <td style="padding:12px 16px;background:#f8f9fa;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:${newUsers.length > 0 ? "#00aa55" : "#333"};">${newUsers.length}</div>
            <div style="font-size:10px;color:#999;letter-spacing:1px;">NEW (24H)</div>
          </td>
          <td style="padding:12px 16px;background:#f8f9fa;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#333;">${activeUsers.length}</div>
            <div style="font-size:10px;color:#999;letter-spacing:1px;">ACTIVE (24H)</div>
          </td>
          <td style="padding:12px 16px;background:#f8f9fa;border-radius:0 6px 6px 0;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#333;">${totalEvents}</div>
            <div style="font-size:10px;color:#999;letter-spacing:1px;">EVENTS</div>
          </td>
        </tr>
      </table>
    `;

    // New signups
    if (newUsers.length > 0) {
      html += `<h3 style="font-size:12px;letter-spacing:2px;color:#999;margin:24px 0 8px;">NEW SIGNUPS</h3>`;
      html += `<table style="width:100%;border-collapse:collapse;">`;
      for (const u of newUsers) {
        html += `<tr><td style="padding:6px 0;color:#333;font-size:13px;">${escapeHtml(u.email)}</td><td style="padding:6px 0;color:#999;font-size:11px;text-align:right;">${u.organization ?? "—"}</td></tr>`;
      }
      html += `</table>`;
    }

    // Active users
    if (activeUsers.length > 0) {
      html += `<h3 style="font-size:12px;letter-spacing:2px;color:#999;margin:24px 0 8px;">ACTIVE USERS (24H)</h3>`;
      html += `<table style="width:100%;border-collapse:collapse;">`;
      for (const u of activeUsers) {
        const lastSeen = u.lastActiveAt
          ? u.lastActiveAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : "—";
        html += `<tr>
          <td style="padding:4px 0;color:#333;font-size:12px;">${escapeHtml(u.email)}</td>
          <td style="padding:4px 0;color:#7c3aed;font-size:10px;text-align:center;">${escapeHtml(u.tier)}</td>
          <td style="padding:4px 0;color:#999;font-size:11px;text-align:right;">Last seen ${lastSeen}</td>
        </tr>`;
      }
      html += `</table>`;
    }

    // Event breakdown
    if (eventCounts.length > 0) {
      html += `<h3 style="font-size:12px;letter-spacing:2px;color:#999;margin:24px 0 8px;">EVENTS BREAKDOWN</h3>`;
      html += `<table style="width:100%;border-collapse:collapse;">`;
      for (const e of eventCounts) {
        html += `<tr><td style="padding:4px 0;color:#333;font-size:12px;">${escapeHtml(e.event)}</td><td style="padding:4px 0;color:#333;font-size:12px;text-align:right;font-weight:600;">${e._count}</td></tr>`;
      }
      html += `</table>`;
    }

    // Top cities
    if (topCities.length > 0) {
      html += `<h3 style="font-size:12px;letter-spacing:2px;color:#999;margin:24px 0 8px;">TOP CITIES VIEWED</h3>`;
      html += `<table style="width:100%;border-collapse:collapse;">`;
      for (const c of topCities) {
        html += `<tr><td style="padding:4px 0;color:#333;font-size:12px;">${escapeHtml(c.entityId ?? "—")}</td><td style="padding:4px 0;color:#333;font-size:12px;text-align:right;font-weight:600;">${c._count}</td></tr>`;
      }
      html += `</table>`;
    }

    // Contact/access requests
    if (recentInquiries.length > 0) {
      html += `<h3 style="font-size:12px;letter-spacing:2px;color:#999;margin:24px 0 8px;">ACCESS REQUESTS / INQUIRIES</h3>`;
      html += `<table style="width:100%;border-collapse:collapse;">`;
      for (const i of recentInquiries) {
        html += `<tr><td style="padding:4px 0;color:#333;font-size:12px;">${escapeHtml(i.name)}</td><td style="padding:4px 0;color:#333;font-size:12px;">${escapeHtml(i.email)}</td><td style="padding:4px 0;color:#7c3aed;font-size:10px;text-align:right;">${escapeHtml(i.tier)}</td></tr>`;
      }
      html += `</table>`;
    }

    // User roster
    html += `<h3 style="font-size:12px;letter-spacing:2px;color:#999;margin:24px 0 8px;">ALL USERS (${allUsers.length})</h3>`;
    html += `<table style="width:100%;border-collapse:collapse;">`;
    for (const u of allUsers.slice(0, 30)) {
      const lastSeen = u.lastActiveAt
        ? u.lastActiveAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "never";
      html += `<tr>
        <td style="padding:3px 0;color:#333;font-size:11px;">${escapeHtml(u.email)}</td>
        <td style="padding:3px 0;color:#7c3aed;font-size:10px;text-align:center;">${escapeHtml(u.tier)}</td>
        <td style="padding:3px 0;color:#999;font-size:10px;text-align:right;">${lastSeen}</td>
      </tr>`;
    }
    if (allUsers.length > 30) {
      html += `<tr><td colspan="3" style="padding:6px 0;color:#999;font-size:10px;text-align:center;">+ ${allUsers.length - 30} more</td></tr>`;
    }
    html += `</table>`;

    html += `
        <p style="color:#bbb;font-size:10px;margin-top:32px;text-align:center;">
          AirIndex Daily Digest &middot; ${now.toISOString().slice(0, 10)}
        </p>
      </div>
    `;

    // Send email
    const from = process.env.SES_FROM_EMAIL || "AirIndex <auth@airindex.io>";
    await sendSesEmail({
      to: adminEmail,
      from,
      subject: `[AirIndex] Daily Digest — ${newUsers.length} new, ${activeUsers.length} active, ${totalEvents} events`,
      html,
    });

    logger.info(`Daily digest sent: ${newUsers.length} new, ${activeUsers.length} active, ${totalEvents} events`);

    return NextResponse.json({
      ok: true,
      summary: {
        totalUsers,
        newUsers: newUsers.length,
        activeUsers: activeUsers.length,
        totalEvents,
        inquiries: recentInquiries.length,
      },
    });
  } catch (err) {
    logger.error("Daily digest failed:", err);
    return NextResponse.json({ error: "Failed to generate digest" }, { status: 500 });
  }
}
