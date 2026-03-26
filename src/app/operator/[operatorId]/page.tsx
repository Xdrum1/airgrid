import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { OPERATORS_MAP, CITIES_MAP, VERTIPORTS, CORRIDORS } from "@/data/seed";

// -------------------------------------------------------
// Metadata
// -------------------------------------------------------
type Props = { params: Promise<{ operatorId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { operatorId } = await params;
  const op = OPERATORS_MAP[operatorId];
  if (!op) return { title: "Operator Not Found — AirIndex" };
  return {
    title: `${op.name} — AirIndex`,
    description: `${op.name} UAM operator profile — FAA certification status, active markets, corridors, vertiports, partnerships, and fleet information tracked by AirIndex.`,
  };
}

export async function generateStaticParams() {
  return Object.keys(OPERATORS_MAP).map((operatorId) => ({ operatorId }));
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
const certLabel: Record<string, string> = {
  operational: "Operational",
  in_progress: "In Progress",
  pending: "Pending",
  "n/a": "N/A",
};

const certColor: Record<string, string> = {
  operational: "#00ff88",
  in_progress: "#f59e0b",
  pending: "#ff6b35",
  "n/a": "#555",
};

const typeLabel: Record<string, string> = {
  evtol_manufacturer: "eVTOL Manufacturer",
  air_taxi_service: "Air Taxi Service",
  drone_delivery: "Drone Delivery",
  cargo: "Cargo",
};

const vpStatusLabel: Record<string, string> = {
  operational: "Operational",
  under_construction: "Under Construction",
  permitted: "Permitted",
  planned: "Planned",
  proposed: "Proposed",
};

const vpStatusColor: Record<string, string> = {
  operational: "#00ff88",
  under_construction: "#f59e0b",
  permitted: "#00d4ff",
  planned: "#7c3aed",
  proposed: "#666",
};

const corStatusColor: Record<string, string> = {
  active: "#00ff88",
  proposed: "#f59e0b",
  under_review: "#00d4ff",
  suspended: "#ff4444",
};

// -------------------------------------------------------
// Styles
// -------------------------------------------------------
const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
  padding: "24px 24px 28px",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 700,
  fontSize: "clamp(18px, 2.5vw, 24px)",
  color: "#e0e0e0",
  margin: "0 0 24px",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 1.5,
  color: "#555",
  textTransform: "uppercase" as const,
  marginBottom: 6,
};

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#e0e0e0",
  fontWeight: 500,
};

// -------------------------------------------------------
// Page
// -------------------------------------------------------
export default async function OperatorDetailPage({ params }: Props) {
  const { operatorId } = await params;
  const op = OPERATORS_MAP[operatorId];
  if (!op) notFound();

  const markets = op.activeMarkets
    .map((id) => CITIES_MAP[id])
    .filter(Boolean);

  const vertiports = VERTIPORTS.filter((v) => v.operatorId === operatorId);
  const corridors = CORRIDORS.filter((c) => c.operatorId === operatorId);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Inter', sans-serif",
        color: "#e0e0e0",
      }}
    >
      <SiteNav />

      {/* Hero */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 0",
        }}
      >
        <Link
          href="/dashboard"
          style={{
            fontSize: 11,
            color: "#555",
            textDecoration: "none",
            letterSpacing: 0.5,
            display: "inline-block",
            marginBottom: 24,
          }}
        >
          &larr; Back to Dashboard
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: op.color,
              boxShadow: `0 0 8px ${op.color}40`,
              flexShrink: 0,
            }}
          />
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 4vw, 40px)",
              margin: 0,
              lineHeight: 1.3,
              color: "#fff",
            }}
          >
            {op.name}
          </h1>
        </div>

        {op.status === "acquired" && (
          <div
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1,
              color: "#f59e0b",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 4,
              padding: "4px 10px",
              marginBottom: 16,
              textTransform: "uppercase",
            }}
          >
            Acquired
          </div>
        )}

        <p
          style={{
            color: "#888",
            fontSize: 15,
            lineHeight: 1.7,
            margin: "8px 0 0",
            maxWidth: 700,
          }}
        >
          {typeLabel[op.type] || op.type} headquartered in {op.hq}.
          {op.website && (
            <>
              {" "}
              <a
                href={op.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#00d4ff",
                  textDecoration: "none",
                  borderBottom: "1px solid rgba(0,212,255,0.3)",
                }}
              >
                {op.website.replace(/^https?:\/\/(www\.)?/, "")}
              </a>
            </>
          )}
        </p>
      </section>

      {/* Key stats */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "40px 20px 0",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
          }}
        >
          {/* FAA Cert */}
          <div style={cardStyle}>
            <div style={labelStyle}>FAA Certification</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: certColor[op.faaCertStatus] || "#555",
                }}
              />
              <span style={valueStyle}>{certLabel[op.faaCertStatus] || op.faaCertStatus}</span>
            </div>
          </div>

          {/* Aircraft */}
          <div style={cardStyle}>
            <div style={labelStyle}>Aircraft</div>
            <div style={valueStyle}>{op.aircraft.join(", ")}</div>
          </div>

          {/* Funding */}
          <div style={cardStyle}>
            <div style={labelStyle}>Funding</div>
            <div style={valueStyle}>{op.funding}</div>
          </div>

          {/* Markets */}
          <div style={cardStyle}>
            <div style={labelStyle}>Active Markets</div>
            <div style={valueStyle}>{markets.length || "—"}</div>
          </div>

          {/* Vertiports */}
          <div style={cardStyle}>
            <div style={labelStyle}>Vertiports</div>
            <div style={valueStyle}>{vertiports.length || "—"}</div>
          </div>

          {/* Corridors */}
          <div style={cardStyle}>
            <div style={labelStyle}>Corridors</div>
            <div style={valueStyle}>{corridors.length || "—"}</div>
          </div>
        </div>
      </section>

      {/* Key Partnerships */}
      {op.keyPartnerships.length > 0 && (
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 0" }}>
          <h2 style={sectionHeadingStyle}>Key Partnerships</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {op.keyPartnerships.map((p) => (
              <div
                key={p}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 13,
                  color: "#c0c8d8",
                  fontWeight: 500,
                }}
              >
                {p}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Acquisitions */}
      {op.acquisitions && op.acquisitions.length > 0 && (
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 0" }}>
          <h2 style={sectionHeadingStyle}>Acquisitions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {op.acquisitions.map((a) => (
              <div
                key={a}
                style={{
                  ...cardStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ color: "#00d4ff", fontSize: 10, flexShrink: 0 }}>&#9646;</span>
                <span style={{ fontSize: 13, color: "#c0c8d8", lineHeight: 1.6 }}>{a}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Markets */}
      {markets.length > 0 && (
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 0" }}>
          <h2 style={sectionHeadingStyle}>Active Markets</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {markets.map((city) => (
              <Link
                key={city.id}
                href={`/dashboard?city=${city.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    ...cardStyle,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 700,
                        fontSize: 15,
                        color: "#e0e0e0",
                        marginBottom: 4,
                      }}
                    >
                      {city.city}
                    </div>
                    <div style={{ fontSize: 11, color: "#666" }}>{city.state}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 700,
                        fontSize: 24,
                        color: "#00d4ff",
                      }}
                    >
                      {city.score}
                    </div>
                    <div style={{ fontSize: 9, color: "#555", letterSpacing: 0.5 }}>
                      READINESS
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Corridors */}
      {corridors.length > 0 && (
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 0" }}>
          <h2 style={sectionHeadingStyle}>Corridors</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {corridors.map((cor) => {
              const city = CITIES_MAP[cor.cityId];
              return (
                <div key={cor.id} style={cardStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontWeight: 700,
                          fontSize: 15,
                          color: "#e0e0e0",
                          marginBottom: 4,
                        }}
                      >
                        {cor.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#666" }}>
                        {city?.city || cor.cityId}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        color: corStatusColor[cor.status] || "#666",
                        background: `${corStatusColor[cor.status] || "#666"}15`,
                        border: `1px solid ${corStatusColor[cor.status] || "#666"}30`,
                        borderRadius: 4,
                        padding: "3px 8px",
                        textTransform: "uppercase",
                      }}
                    >
                      {cor.status.replace("_", " ")}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 24,
                      fontSize: 12,
                      color: "#888",
                    }}
                  >
                    <span>{cor.distanceKm} km</span>
                    <span>{cor.estimatedFlightMinutes} min</span>
                    <span>{cor.maxAltitudeFt?.toLocaleString()} ft</span>
                  </div>
                  {cor.notes && (
                    <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginTop: 10 }}>
                      {cor.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Vertiports */}
      {vertiports.length > 0 && (
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 0" }}>
          <h2 style={sectionHeadingStyle}>Vertiports</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {vertiports.map((vp) => {
              const city = CITIES_MAP[vp.cityId];
              return (
                <div key={vp.id} style={cardStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#e0e0e0",
                      }}
                    >
                      {vp.name}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        color: vpStatusColor[vp.status] || "#666",
                        background: `${vpStatusColor[vp.status] || "#666"}15`,
                        border: `1px solid ${vpStatusColor[vp.status] || "#666"}30`,
                        borderRadius: 4,
                        padding: "3px 8px",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {vpStatusLabel[vp.status] || vp.status}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      <span style={{ color: "#555" }}>Market:</span> {city?.city || vp.cityId}
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      <span style={{ color: "#555" }}>Type:</span>{" "}
                      {vp.siteType.replace("_", " ")}
                    </div>
                    <div style={{ fontSize: 12, color: "#888" }}>
                      <span style={{ color: "#555" }}>Pads:</span> {vp.padCount}
                      {vp.chargingCapable && " (charging capable)"}
                    </div>
                    {vp.expectedOpenDate && (
                      <div style={{ fontSize: 12, color: "#888" }}>
                        <span style={{ color: "#555" }}>Expected:</span>{" "}
                        {new Date(vp.expectedOpenDate).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Last Updated + CTA */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#444", fontSize: 11, marginBottom: 24 }}>
          Last updated {new Date(op.lastUpdated).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            background: "rgba(0,212,255,0.1)",
            border: "1px solid rgba(0,212,255,0.3)",
            color: "#00d4ff",
            fontWeight: 600,
            fontSize: 13,
            padding: "12px 28px",
            borderRadius: 8,
            textDecoration: "none",
            letterSpacing: 0.3,
          }}
        >
          Explore Markets in Dashboard
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
