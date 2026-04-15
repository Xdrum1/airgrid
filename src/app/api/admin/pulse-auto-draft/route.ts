/**
 * Auto-draft the weekly Pulse and email Alan the draft for review.
 *
 * Triggered by GitHub Actions every Monday 10:00 UTC. Calls the same
 * drafter used by generate-pulse-template.ts --draft, but skips the
 * filesystem write (Amplify serverless has no persistent FS) and emails
 * Alan the complete drafted content instead. Alan reviews in the email,
 * copies the headline/lede/body into a local run of generate-pulse-template
 * if he wants the file artifact, then sends via send-pulse.ts.
 *
 * Issue number: takes ?issue=N from query if provided; otherwise uses the
 * current ISO week number so every Monday automatically gets a unique
 * number without any workflow state.
 *
 * Auth: CRON_SECRET via Bearer.
 */
import { NextRequest, NextResponse } from "next/server";
import { authorizeCron } from "@/lib/admin-helpers";
import { sendSesEmail } from "@/lib/ses";
import { getPlatformForecastDigest } from "@/lib/forward-signals";
import { draftPulse } from "@/lib/pulse-drafter";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "alan@airindex.io";
const FROM = "AirIndex Pipeline <hello@airindex.io>";

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function GET(req: NextRequest) {
  const denied = authorizeCron(req);
  if (denied) return denied;

  try {
    const issueParam = req.nextUrl.searchParams.get("issue");
    const issue = issueParam ? parseInt(issueParam) : getISOWeek(new Date());
    const topParam = req.nextUrl.searchParams.get("top");
    const topN = topParam ? parseInt(topParam) : 5;

    // Pull the digest and draft the editorial content
    const digest = await getPlatformForecastDigest();
    const top = digest.slice(0, topN);
    const draft = await draftPulse(top);

    // Build the reviewer email — includes the full drafted HTML inline +
    // top-5 digest summary + next-step instructions.
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const topLines = top
      .map((m, i) => {
        const watch = m.marketWatch ? `${m.marketWatch.status}/${m.marketWatch.outlook}` : "no watch";
        const forecast = m.expectedScoreChange30d
          ? ` · 30d: ${m.expectedScoreChange30d > 0 ? "+" : ""}${m.expectedScoreChange30d}`
          : "";
        return `  #${i + 1} ${m.cityName}, ${m.state} — ${m.currentScore}/100 · ${watch}${forecast}`;
      })
      .join("\n");

    const reviewEmailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:'Inter','Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#050508;padding:20px 28px;">
        <span style="color:#5B8DB8;font-size:10px;font-weight:700;letter-spacing:0.12em;">AIRINDEX PIPELINE · PULSE AUTO-DRAFT</span>
        <div style="color:#fff;font-size:18px;font-weight:700;margin-top:8px;">Issue ${issue} — ${dateStr}</div>
      </div>

      <div style="padding:20px 28px 8px;">
        <p style="color:#555;font-size:13px;line-height:1.7;margin:0 0 20px;">
          Opus 4.6 drafted this week&rsquo;s Pulse from the Forward Signals pipeline.
          Review and edit the headline/lede/body below. To ship, either copy this
          content into a fresh generated template, or run locally:
        </p>
        <pre style="background:#f5f6f8;padding:12px 16px;border-radius:6px;font-size:12px;color:#333;overflow-x:auto;margin:0 0 20px;">npx tsx scripts/generate-pulse-template.ts --issue ${issue} --draft
# review file, rename to UAM_Market_Pulse_Issue${issue}.html
npx tsx scripts/pulse-preflight.ts
npx tsx scripts/send-pulse.ts --issue ${issue}</pre>
      </div>

      <div style="padding:0 28px;">
        <h2 style="color:#111;font-size:14px;font-weight:700;margin:16px 0 8px;letter-spacing:-0.01em;">HEADLINE</h2>
        <div style="background:#fffbea;border-left:3px solid #f59e0b;padding:12px 16px;font-size:17px;font-weight:700;color:#111;border-radius:4px;margin-bottom:16px;">
          ${draft.headline}
        </div>

        <h2 style="color:#111;font-size:14px;font-weight:700;margin:16px 0 8px;letter-spacing:-0.01em;">LEDE</h2>
        <div style="background:#f0f6ff;border-left:3px solid #5B8DB8;padding:12px 16px;font-style:italic;font-size:14px;line-height:1.7;color:#333;border-radius:4px;margin-bottom:16px;">
          ${draft.lede}
        </div>

        <h2 style="color:#111;font-size:14px;font-weight:700;margin:16px 0 8px;letter-spacing:-0.01em;">SECTION HEADING</h2>
        <div style="background:#f5f6f8;padding:12px 16px;font-size:15px;font-weight:700;color:#111;border-radius:4px;margin-bottom:16px;">
          ${draft.nextSectionHeading}
        </div>

        <h2 style="color:#111;font-size:14px;font-weight:700;margin:16px 0 8px;letter-spacing:-0.01em;">BODY</h2>
        <div style="padding:12px 0;font-size:14px;line-height:1.8;color:#333;white-space:pre-wrap;">${draft.body}</div>
      </div>

      <div style="padding:16px 28px;border-top:1px solid #f0f0f0;background:#fafafa;">
        <h3 style="color:#555;font-size:12px;font-weight:700;margin:0 0 8px;letter-spacing:0.04em;">TOP ${topN} MARKETS USED FOR DRAFT</h3>
        <pre style="font-size:11px;color:#555;margin:0;font-family:'Courier New',monospace;">${topLines}</pre>
      </div>

      <div style="padding:16px 28px;border-top:1px solid #f0f0f0;font-size:11px;color:#999;">
        AirIndex Pipeline &middot; Vertical Data Group, LLC &middot; Triggered by Monday Pulse auto-draft cron
      </div>
    </div>
  </div>
</body></html>`;

    await sendSesEmail({
      to: ADMIN_EMAIL,
      from: FROM,
      subject: `[Pulse Draft] Issue ${issue} ready for review — ${draft.headline.slice(0, 70)}`,
      html: reviewEmailHtml,
    });

    return NextResponse.json({
      success: true,
      issue,
      topMarkets: top.length,
      headline: draft.headline,
      ledeHead: draft.lede.slice(0, 120),
    });
  } catch (err) {
    console.error("[pulse-auto-draft] Error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message ?? "Draft failed" },
      { status: 500 },
    );
  }
}
