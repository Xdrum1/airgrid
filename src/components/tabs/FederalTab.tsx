"use client";

import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/track";
import { plausible } from "@/lib/plausible";

interface CongressBill {
  congress: number;
  type: string;
  number: number;
  title: string;
  introducedDate: string;
  latestAction: { actionDate: string; text: string };
  url: string;
  policyArea?: { name: string };
  originChamber?: string;
  label?: string;
  relevance?: string;
}

interface TrackedBill {
  congress: number;
  type: string;
  number: number;
  label: string;
  relevance: string;
}

interface RegulationDoc {
  id: string;
  title: string;
  documentType: string;
  docketId: string;
  agencyId: string;
  postedDate: string;
  commentEndDate: string | null;
  url: string;
}

interface FederalData {
  congress: {
    bills: CongressBill[];
    tracked: TrackedBill[];
    isLive: boolean;
  };
  regulations: RegulationDoc[];
  fetchedAt: string;
}

type Section = "legislation" | "regulations";

export default function FederalTab({
  animate,
  isMobile,
}: {
  animate: boolean;
  isMobile: boolean;
}) {
  const [data, setData] = useState<FederalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("legislation");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/internal/federal-activity")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message ?? "Failed to fetch"))
      .finally(() => setLoading(false));
  }, []);

  const congressLabel = (type: string) =>
    type === "s" || type === "S" ? "S" : "HR";

  const statusColor = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("became public law") || lower.includes("signed by president"))
      return "#00ff88";
    if (lower.includes("passed") || lower.includes("agreed to"))
      return "#5B8DB8";
    if (lower.includes("referred to") || lower.includes("introduced"))
      return "#f59e0b";
    return "#888";
  };

  const docTypeColors: Record<string, string> = {
    Rule: "#ff4444",
    "Proposed Rule": "#f59e0b",
    Notice: "#5B8DB8",
    Other: "#888",
  };

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: isMobile ? "12px 12px" : "16px 20px",
        paddingLeft: isMobile ? 12 : 292,
        paddingRight: isMobile ? 12 : 316,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 10,
          }}
        >
          <div>
            <div
              style={{
                color: "#777",
                fontSize: 8,
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              FEDERAL ACTIVITY
            </div>
            <div style={{ color: "#888", fontSize: 10 }}>
              Tracked AAM legislation & FAA regulatory dockets
            </div>
          </div>
          {data?.fetchedAt && (
            <span style={{ color: "#777", fontSize: 8, flexShrink: 0 }}>
              FETCHED {new Date(data.fetchedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Section toggle */}
        <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: 2 }}>
          {([
            ["legislation", "LEGISLATION", data?.congress.isLive ? data.congress.bills.length : data?.congress.tracked.length],
            ["regulations", "FAA DOCKETS", data?.regulations.length],
          ] as [Section, string, number | undefined][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => {
                setSection(key);
                trackEvent("federal_section", "section", key);
                plausible("Federal Section", { section: key });
              }}
              style={{
                flex: 1,
                background: section === key ? "rgba(91,141,184,0.1)" : "transparent",
                border: section === key ? "1px solid rgba(91,141,184,0.2)" : "1px solid transparent",
                borderRadius: 4,
                padding: "8px 12px",
                color: section === key ? "#5B8DB8" : "#666",
                fontSize: 9,
                letterSpacing: 1.5,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s",
              }}
            >
              {label}{count !== undefined ? ` (${count})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "40px 0",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              border: "2px solid rgba(91,141,184,0.2)",
              borderTopColor: "#5B8DB8",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ color: "#888", fontSize: 11 }}>
            Fetching federal activity...
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            border: "1px solid rgba(255,68,68,0.3)",
            background: "rgba(255,68,68,0.05)",
            borderRadius: 6,
            padding: "12px 16px",
            color: "#ff4444",
            fontSize: 11,
          }}
        >
          Failed to load federal activity: {error}
        </div>
      )}

      {/* Legislation Section */}
      {!loading && !error && data && section === "legislation" && (
        <>
          {/* Live bills (from Congress.gov API) */}
          {data.congress.isLive && data.congress.bills.length > 0 && (
            <>
              <div style={{ color: "#555", fontSize: 8, letterSpacing: 1.5, marginBottom: 10 }}>
                TRACKED BILLS — LIVE STATUS FROM CONGRESS.GOV
              </div>
              {data.congress.bills.map((bill, i) => (
                <a
                  key={`${bill.congress}-${bill.type}-${bill.number}`}
                  href={bill.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    trackEvent("congress_bill_click", "bill", `${bill.congress}-${bill.type}-${bill.number}`);
                    plausible("Congress Bill Click", { bill: `${bill.type}${bill.number}` });
                  }}
                  style={{
                    display: "block",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 8,
                    padding: "14px 16px",
                    marginBottom: 8,
                    textDecoration: "none",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                    opacity: animate ? 1 : 0,
                    transform: animate ? "translateY(0)" : "translateY(4px)",
                    transitionProperty: "opacity, transform, border-color",
                    transitionDuration: "0.25s",
                    transitionDelay: `${i * 0.02}s`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(91,141,184,0.3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}
                >
                  {/* Bill identifier + congress */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        color: "#5B8DB8",
                        fontSize: 8,
                        letterSpacing: 1,
                        border: "1px solid rgba(91,141,184,0.3)",
                        borderRadius: 3,
                        padding: "2px 6px",
                        fontFamily: "'Space Mono', monospace",
                      }}
                    >
                      {congressLabel(bill.type)} {bill.number}
                    </span>
                    <span style={{ color: "#555", fontSize: 8, letterSpacing: 1 }}>
                      {bill.congress}TH CONGRESS
                    </span>
                    {bill.label && (
                      <span style={{ color: "#888", fontSize: 9, fontStyle: "italic" }}>
                        {bill.label}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div
                    style={{
                      color: "#ddd",
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1.4,
                      marginBottom: 6,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {bill.title}
                  </div>

                  {/* Latest action */}
                  {bill.latestAction && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: statusColor(bill.latestAction.text),
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: "#999", fontSize: 10, lineHeight: 1.4 }}>
                        {bill.latestAction.actionDate} — {bill.latestAction.text}
                      </span>
                    </div>
                  )}

                  {/* Relevance note */}
                  {bill.relevance && (
                    <div style={{ color: "#666", fontSize: 9, marginTop: 4 }}>
                      {bill.relevance}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ color: "#555", fontSize: 8 }}>
                      Introduced {bill.introducedDate}
                    </span>
                    <span style={{ color: "#555", fontSize: 8 }}>congress.gov →</span>
                  </div>
                </a>
              ))}
            </>
          )}

          {/* Curated bill list (fallback when no API key) */}
          {!data.congress.isLive && data.congress.tracked.length > 0 && (
            <>
              <div
                style={{
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.15)",
                  borderRadius: 6,
                  padding: "10px 14px",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ color: "#f59e0b", fontSize: 10 }}>
                  Showing curated bill list. Live status updates require Congress.gov API key.
                </span>
              </div>
              <div style={{ color: "#555", fontSize: 8, letterSpacing: 1.5, marginBottom: 10 }}>
                TRACKED AAM LEGISLATION — {data.congress.tracked.length} BILLS
              </div>
              {data.congress.tracked.map((bill, i) => {
                const isActive = bill.congress >= 119;
                return (
                  <div
                    key={`${bill.congress}-${bill.type}-${bill.number}`}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 8,
                      padding: "12px 16px",
                      marginBottom: 8,
                      opacity: animate ? 1 : 0,
                      transform: animate ? "translateY(0)" : "translateY(4px)",
                      transition: "opacity 0.25s, transform 0.25s",
                      transitionDelay: `${i * 0.02}s`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          color: isActive ? "#5B8DB8" : "#666",
                          fontSize: 8,
                          letterSpacing: 1,
                          border: `1px solid ${isActive ? "rgba(91,141,184,0.3)" : "rgba(255,255,255,0.1)"}`,
                          borderRadius: 3,
                          padding: "2px 6px",
                          fontFamily: "'Space Mono', monospace",
                        }}
                      >
                        {congressLabel(bill.type)} {bill.number}
                      </span>
                      <span style={{ color: "#555", fontSize: 8, letterSpacing: 1 }}>
                        {bill.congress}TH CONGRESS
                      </span>
                      <span
                        style={{
                          color: isActive ? "#00ff88" : "#666",
                          fontSize: 7,
                          letterSpacing: 1,
                          border: `1px solid ${isActive ? "rgba(0,255,136,0.2)" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 3,
                          padding: "1px 5px",
                        }}
                      >
                        {isActive ? "ACTIVE" : "REFERENCE"}
                      </span>
                    </div>
                    <div style={{ color: "#ddd", fontSize: 11, fontWeight: 700, marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>
                      {bill.label}
                    </div>
                    <div style={{ color: "#888", fontSize: 10, lineHeight: 1.5 }}>
                      {bill.relevance}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {!data.congress.isLive && data.congress.tracked.length === 0 && (
            <div style={{ color: "#777", fontSize: 11, textAlign: "center", padding: "40px 0" }}>
              No tracked legislation found.
            </div>
          )}
        </>
      )}

      {/* Regulations Section */}
      {!loading && !error && data && section === "regulations" && (
        <>
          {data.regulations.length === 0 ? (
            <div
              style={{
                color: "#777",
                fontSize: 11,
                textAlign: "center",
                padding: "40px 0",
              }}
            >
              {!process.env.NEXT_PUBLIC_HAS_REGULATIONS_KEY
                ? "Regulations.gov data requires API key configuration."
                : "No FAA dockets found matching AAM search terms."}
            </div>
          ) : (
            <>
              <div style={{ color: "#555", fontSize: 8, letterSpacing: 1.5, marginBottom: 10 }}>
                FAA REGULATORY DOCKETS — {data.regulations.length} DOCUMENTS
              </div>
              {data.regulations.map((doc, i) => {
                const badgeColor = docTypeColors[doc.documentType] ?? "#888";
                const hasOpenComments = doc.commentEndDate && new Date(doc.commentEndDate) > new Date();
                return (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      trackEvent("regulation_click", "regulation", doc.id);
                      plausible("Regulation Click", { type: doc.documentType });
                    }}
                    style={{
                      display: "block",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 8,
                      padding: "14px 16px",
                      marginBottom: 8,
                      textDecoration: "none",
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                      opacity: animate ? 1 : 0,
                      transform: animate ? "translateY(0)" : "translateY(4px)",
                      transitionProperty: "opacity, transform, border-color",
                      transitionDuration: "0.25s",
                      transitionDelay: `${i * 0.02}s`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(91,141,184,0.3)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          color: badgeColor,
                          fontSize: 8,
                          letterSpacing: 1,
                          border: `1px solid ${badgeColor}44`,
                          borderRadius: 3,
                          padding: "2px 6px",
                          textTransform: "uppercase",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {doc.documentType}
                      </span>
                      <span style={{ color: "#777", fontSize: 9 }}>{doc.postedDate}</span>
                      {hasOpenComments && (
                        <span
                          style={{
                            color: "#00ff88",
                            fontSize: 7,
                            letterSpacing: 1,
                            border: "1px solid rgba(0,255,136,0.25)",
                            borderRadius: 3,
                            padding: "1px 5px",
                            animation: "pulse 2s infinite",
                          }}
                        >
                          COMMENTS OPEN
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        color: "#ddd",
                        fontSize: 11,
                        fontWeight: 700,
                        lineHeight: 1.4,
                        marginBottom: 6,
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {doc.title}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#666", fontSize: 8 }}>
                        {doc.docketId} · {doc.agencyId}
                      </span>
                      {doc.commentEndDate && (
                        <span style={{ color: hasOpenComments ? "#00ff88" : "#555", fontSize: 8 }}>
                          Comments {hasOpenComments ? "close" : "closed"} {doc.commentEndDate}
                        </span>
                      )}
                      {!doc.commentEndDate && (
                        <span style={{ color: "#555", fontSize: 8 }}>regulations.gov →</span>
                      )}
                    </div>
                  </a>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}
