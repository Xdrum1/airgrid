/**
 * Send a persona briefing to a named recipient.
 *
 * Each briefing is a live URL — this script emails a branded invitation
 * linking to it, logs the send, and wraps the link in the standard
 * click-tracking wrapper so we can see open + click events attached to
 * the recipient.
 *
 * Usage:
 *   npx tsx scripts/send-briefing.ts --persona investor --city miami --to alan@airindex.io
 *   npx tsx scripts/send-briefing.ts --persona insurance --city phoenix --to underwriter@carrier.com --name "Jane Smith"
 *   npx tsx scripts/send-briefing.ts --persona operator --city los_angeles --to strategy@joby.aero --name "Strategy Team" --dry-run
 *
 * Supported personas: infrastructure, municipality, insurance, operator, investor
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { sendSesEmail } from "../src/lib/ses";
import { buildClickTrackUrl } from "../src/lib/newsletter-token";
import { CITIES } from "../src/data/seed";

type Persona = "infrastructure" | "municipality" | "insurance" | "operator" | "investor";

const PERSONA_CONFIG: Record<Persona, {
  routeSegment: string;
  accentColor: string;
  label: string;
  audienceLine: string;
  sections: string[];
}> = {
  infrastructure: {
    routeSegment: "briefing",
    accentColor: "#00d4ff",
    label: "Infrastructure Briefing",
    audienceLine: "Infrastructure developers, REITs, site-selection teams.",
    sections: [
      "Market score & readiness tier",
      "Site conversion viability",
      "Factor breakdown with infrastructure emphasis",
      "Market context — state peers + regional cluster + state posture",
      "Regulatory trajectory",
      "Capital exposure by gap",
      "Development roadmap",
    ],
  },
  municipality: {
    routeSegment: "briefing-municipality",
    accentColor: "#5B8DB8",
    label: "Municipality Briefing",
    audienceLine: "City planners, state agencies, economic development offices.",
    sections: [
      "Where your city stands",
      "Ordinance & terminology audit",
      "Peer cities & state context",
      "Factor breakdown with municipal emphasis",
      "Gap roadmap prioritized by ease and impact",
      "Operator attraction assessment",
      "Score trajectory",
    ],
  },
  insurance: {
    routeSegment: "briefing-insurance",
    accentColor: "#b45309",
    label: "Insurance Briefing",
    audienceLine: "Aviation liability carriers, brokers, risk managers.",
    sections: [
      "Market summary — score, heliport count, hospital exposure",
      "State regulatory posture",
      "Five-question compliance audit",
      "Regulatory precedents driving scoring factors",
      "Peer exposure markets",
      "What to watch — next 60 days",
      "Portfolio engagement",
    ],
  },
  operator: {
    routeSegment: "briefing-operator",
    accentColor: "#7c3aed",
    label: "Operator Market-Entry Briefing",
    audienceLine: "eVTOL operator strategy teams evaluating deployment priority.",
    sections: [
      "Market readiness",
      "Operator landscape — deployment stages + commitments",
      "Infrastructure available for operations",
      "Regulatory friction",
      "Peer markets for entry comparison",
      "Entry timing — what to watch",
      "Market-entry advisory",
    ],
  },
  investor: {
    routeSegment: "briefing-investor",
    accentColor: "#0369a1",
    label: "Investor Briefing",
    audienceLine: "Institutional investors, corp dev, sector analysts covering UAM.",
    sections: [
      "Investment thesis summary",
      "Score trajectory — 180 days",
      "Operator capital flow",
      "Federal program capital",
      "Regulatory catalysts",
      "Portfolio diversification peers",
      "Catalysts — next 60–180 days",
      "Research coverage",
    ],
  },
};

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function buildEmailHtml(params: {
  persona: Persona;
  cityName: string;
  cityState: string;
  briefingUrl: string;
  recipientName: string | null;
  customMessage: string | null;
}): string {
  const cfg = PERSONA_CONFIG[params.persona];
  const greeting = params.recipientName ? `Hi ${params.recipientName},` : "Hi,";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${cfg.label} — ${params.cityName}, ${params.cityState}</title></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f6f8;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;max-width:600px;">
        <tr><td style="padding:36px 40px 20px;border-top:3px solid ${cfg.accentColor};">
          <div style="font:700 11px/1 'Courier New',monospace;color:${cfg.accentColor};letter-spacing:0.15em;text-transform:uppercase;">
            AIRINDEX · ${cfg.label.toUpperCase()}
          </div>
          <h1 style="font:700 24px/1.3 'Helvetica Neue',Arial,sans-serif;color:#111;margin:14px 0 0;">
            ${params.cityName}, ${params.cityState}
          </h1>
        </td></tr>

        <tr><td style="padding:8px 40px 0;">
          <p style="font:15px/1.7 'Helvetica Neue',Arial,sans-serif;color:#333;margin:0 0 18px;">
            ${greeting}
          </p>
          ${params.customMessage
            ? `<p style="font:15px/1.7 'Helvetica Neue',Arial,sans-serif;color:#333;margin:0 0 18px;">${params.customMessage}</p>`
            : `<p style="font:15px/1.7 'Helvetica Neue',Arial,sans-serif;color:#333;margin:0 0 18px;">Sharing a market intelligence briefing on <strong>${params.cityName}</strong>, scoped for ${cfg.audienceLine.toLowerCase().replace(/\.$/, "")}.</p>`
          }
          <p style="font:13px/1.7 'Helvetica Neue',Arial,sans-serif;color:#666;margin:0 0 18px;">
            The briefing draws on AirIndex&rsquo;s five-container intelligence stack
            (scoring knowledge base, market context, operator intelligence, regulatory
            precedents, federal programs) and includes:
          </p>
          <ul style="font:13px/1.8 'Helvetica Neue',Arial,sans-serif;color:#444;margin:0 0 24px;padding-left:20px;">
            ${cfg.sections.map((s) => `<li>${s}</li>`).join("")}
          </ul>
        </td></tr>

        <tr><td style="padding:0 40px 16px;">
          <a href="${params.briefingUrl}" style="display:inline-block;padding:12px 24px;background:${cfg.accentColor};color:#ffffff;text-decoration:none;border-radius:6px;font:700 13px/1 'Helvetica Neue',Arial,sans-serif;letter-spacing:0.05em;">
            View ${cfg.label} →
          </a>
        </td></tr>

        <tr><td style="padding:24px 40px 0;border-top:1px solid #eee;">
          <p style="font:12px/1.7 'Helvetica Neue',Arial,sans-serif;color:#888;margin:0 0 8px;">
            Questions or scoping conversations — reply directly or reach
            <a href="mailto:sales@airindex.io" style="color:${cfg.accentColor};text-decoration:none;">sales@airindex.io</a>.
          </p>
        </td></tr>

        <tr><td style="padding:20px 40px 36px;">
          <p style="font:11px/1.6 'Helvetica Neue',Arial,sans-serif;color:#aaa;margin:0;">
            Vertical Data Group, LLC · AirIndex · airindex.io<br>
            Confidential and for the addressed recipient only.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function main() {
  const personaArg = arg("persona");
  const cityId = arg("city");
  const to = arg("to");
  const name = arg("name") ?? null;
  const customMessage = arg("message") ?? null;
  const dryRun = process.argv.includes("--dry-run");

  if (!personaArg || !cityId || !to) {
    console.error(
      "Usage: npx tsx scripts/send-briefing.ts --persona <persona> --city <cityId> --to <email> [--name <name>] [--message <custom>] [--dry-run]",
    );
    console.error("Personas: infrastructure | municipality | insurance | operator | investor");
    process.exit(1);
  }

  if (!(personaArg in PERSONA_CONFIG)) {
    console.error(`Unknown persona: ${personaArg}`);
    console.error("Valid: infrastructure | municipality | insurance | operator | investor");
    process.exit(1);
  }
  const persona = personaArg as Persona;

  const city = CITIES.find((c) => c.id === cityId);
  if (!city) {
    console.error(`Unknown city: ${cityId}`);
    console.error("Valid city IDs: " + CITIES.map((c) => c.id).join(", "));
    process.exit(1);
  }

  const cfg = PERSONA_CONFIG[persona];
  const rawUrl = `https://www.airindex.io/reports/${cfg.routeSegment}/${cityId}`;
  // Wrap in click tracker so we see when the recipient clicks through. Issue 0
  // indicates a briefing send (not a Pulse issue).
  const trackedUrl = buildClickTrackUrl(to, 0, rawUrl, `briefing_${persona}`);

  const subject = `${cfg.label} — ${city.city}, ${city.state}`;
  const html = buildEmailHtml({
    persona,
    cityName: city.city,
    cityState: city.state,
    briefingUrl: trackedUrl,
    recipientName: name,
    customMessage,
  });

  console.log(`\nBriefing: ${cfg.label}`);
  console.log(`Market:   ${city.city}, ${city.state}`);
  console.log(`To:       ${to}${name ? ` (${name})` : ""}`);
  console.log(`URL:      ${rawUrl}`);
  if (customMessage) console.log(`Message:  ${customMessage}`);
  console.log("");

  if (dryRun) {
    console.log("DRY RUN — no email sent.");
    return;
  }

  await sendSesEmail({
    to,
    from: "AirIndex <hello@airindex.io>",
    subject,
    html,
  });
  console.log(`[ok] Sent.`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
