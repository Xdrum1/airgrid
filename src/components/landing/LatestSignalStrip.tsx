import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CITIES } from "@/data/seed";

/**
 * LatestSignalStrip — server component
 *
 * Surfaces the most recently *applied* scoring override on the homepage so the
 * page reads as a live intelligence system, not a static brochure. Queried at
 * build/ISR time only (parent page revalidates hourly).
 *
 * Renders nothing if no applied overrides exist (graceful degrade).
 */

const FACTOR_LABELS: Record<string, string> = {
  stateLegislation: "State Legislation",
  activePilotProgram: "Active Pilot Program",
  activeOperatorPresence: "Operator Presence",
  approvedVertiport: "Approved Vertiport",
  vertiportZoning: "Vertiport Zoning",
  regulatoryPosture: "Regulatory Posture",
  weatherInfrastructure: "Weather Infrastructure",
  hasActivePilotProgram: "Active Pilot Program",
  hasVertiportZoning: "Vertiport Zoning",
};

function cleanReason(raw: string): string {
  // Strip "[NLP] " prefix and any trailing "—" source attribution clause that
  // duplicates the headline, so we surface a clean one-liner.
  let s = raw.replace(/^\[NLP\]\s*/i, "");
  // If there's an em-dash separator, take only the first half (the headline).
  const dashIdx = s.indexOf(" — ");
  if (dashIdx > 60) s = s.slice(0, dashIdx);
  return s.trim();
}

function formatSignalDate(d: Date): string {
  return d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    })
    .toUpperCase();
}

export default async function LatestSignalStrip() {
  const override = await prisma.scoringOverride
    .findFirst({
      where: { appliedAt: { not: null } },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);

  if (!override) return null;

  const city = CITIES.find((c) => c.id === override.cityId);
  if (!city) return null;

  const factorLabel = FACTOR_LABELS[override.field] ?? override.field;
  const narrative = cleanReason(override.reason);

  return (
    <section
      style={{
        maxWidth: 1040,
        margin: "0 auto",
        padding: "8px 24px clamp(24px, 4vw, 48px)",
      }}
    >
      <Link
        href={`/city/${city.id}`}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        <div
          className="signal-strip"
          style={{
            position: "relative",
            background: "#ffffff",
            border: "1px solid #e3e8ee",
            borderRadius: 12,
            padding: "20px 24px 18px",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 18,
            alignItems: "start",
            boxShadow: "0 1px 2px rgba(10,37,64,0.04)",
            transition: "box-shadow 0.2s ease, border-color 0.2s ease",
          }}
        >
          {/* Left column: eyebrow + narrative */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span
                aria-hidden="true"
                className="signal-strip__pulse"
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#2dd4bf",
                  boxShadow: "0 0 0 4px rgba(45,212,191,0.18)",
                }}
              />
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  color: "#5B8DB8",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Live Signal · {formatSignalDate(override.createdAt)}
              </span>
            </div>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 16,
                lineHeight: 1.55,
                color: "#0a2540",
                margin: "0 0 8px",
                fontWeight: 500,
              }}
            >
              {narrative}
            </p>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                color: "#697386",
                letterSpacing: "0.04em",
              }}
            >
              {city.city}, {city.state} · {factorLabel} · view market →
            </span>
          </div>

          {/* Right column: confidence chip */}
          <div
            style={{
              alignSelf: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
            }}
          >
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 9.5,
                letterSpacing: "0.12em",
                color: "#697386",
                textTransform: "uppercase",
              }}
            >
              Confidence
            </span>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: override.confidence === "high" ? "#16a34a" : "#f59e0b",
                textTransform: "uppercase",
              }}
            >
              {override.confidence}
            </span>
          </div>
        </div>
      </Link>

      <style>{`
        .signal-strip:hover {
          box-shadow: 0 4px 12px rgba(10,37,64,0.08);
          border-color: #c7d3df;
        }
        .signal-strip__pulse {
          animation: signalPulse 2.4s ease-in-out infinite;
        }
        @keyframes signalPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(45,212,191,0.18); }
          50% { box-shadow: 0 0 0 7px rgba(45,212,191,0.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .signal-strip__pulse { animation: none; }
        }
      `}</style>
    </section>
  );
}
