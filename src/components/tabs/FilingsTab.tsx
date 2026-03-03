"use client";

import type { FederalFiling } from "@/lib/faa-api";
import { trackEvent } from "@/lib/track";
import { plausible } from "@/lib/plausible";

export default function FilingsTab({
  filings,
  loading,
  error,
  fetchedAt,
  animate,
  isMobile,
}: {
  filings: FederalFiling[];
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  animate: boolean;
  isMobile: boolean;
}) {
  return (
    <div
      style={{ flex: 1, overflow: "auto", padding: isMobile ? "12px 12px" : "16px 20px", paddingLeft: isMobile ? 12 : 292, paddingRight: isMobile ? 12 : 316 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              color: "#444",
              fontSize: 8,
              letterSpacing: 2,
              marginBottom: 4,
            }}
          >
            FEDERAL REGISTER
          </div>
          <div style={{ color: "#555", fontSize: 10 }}>
            UAM / eVTOL / vertiport regulatory filings
          </div>
        </div>
        {fetchedAt && (
          <span style={{ color: "#444", fontSize: 8, flexShrink: 0 }}>
            FETCHED {new Date(fetchedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

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
              border: "2px solid rgba(0,212,255,0.2)",
              borderTopColor: "#00d4ff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ color: "#555", fontSize: 11 }}>
            Fetching filings...
          </span>
        </div>
      )}

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
          Failed to load filings: {error}
        </div>
      )}

      {!loading && !error && filings.length === 0 && fetchedAt && (
        <div
          style={{
            color: "#444",
            fontSize: 11,
            textAlign: "center",
            padding: "40px 0",
          }}
        >
          No filings found in the last 90 days.
        </div>
      )}

      {filings.map((filing, i) => {
        const typeColors: Record<string, string> = {
          Rule: "#ff4444",
          "Proposed Rule": "#f59e0b",
          Notice: "#00d4ff",
          "Presidential Document": "#7c3aed",
        };
        const badgeColor = typeColors[filing.type] ?? "#555";

        return (
          <a
            key={filing.document_number}
            href={filing.html_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { trackEvent("filing_click", "filing", filing.document_number, { type: filing.type }); plausible("Filing Click", { type: filing.type }); }}
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
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "rgba(0,212,255,0.3)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")
            }
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  color: badgeColor,
                  fontSize: 8,
                  letterSpacing: 1,
                  border: `1px solid ${badgeColor}44`,
                  borderRadius: 3,
                  padding: "2px 6px",
                  textTransform: "uppercase",
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                {filing.type}
              </span>
              <span style={{ color: "#444", fontSize: 9 }}>
                {filing.publication_date}
              </span>
            </div>
            <div
              style={{
                color: "#ddd",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1.4,
                marginBottom: 6,
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {filing.title}
            </div>
            {filing.abstract && (
              <div
                style={{
                  color: "#666",
                  fontSize: 10,
                  lineHeight: 1.6,
                  marginBottom: 8,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {filing.abstract}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#333", fontSize: 8 }}>
                {filing.document_number}
              </span>
              <span style={{ color: "#333", fontSize: 8 }}>
                federalregister.gov →
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
