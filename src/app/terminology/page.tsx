import type { Metadata } from "next";
import Link from "next/link";
import TrackPageView from "@/components/TrackPageView";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Terminology Reference — AirIndex",
  description:
    "Source-traced, scoring-linked terminology for vertical flight infrastructure. FAA-defined terms for heliports, vertiports, and advanced air mobility — with scoring implications.",
};

// -------------------------------------------------------
// Category color map
// -------------------------------------------------------
const CATEGORY_COLORS: Record<string, string> = {
  infrastructure: "#5B8DB8",
  regulatory: "#7c3aed",
  standards: "#f59e0b",
  operational: "#00ff88",
  legislative: "#ff6b35",
};

const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: "Infrastructure",
  regulatory: "Regulatory",
  standards: "Standards",
  operational: "Operational",
  legislative: "Legislative",
};

// -------------------------------------------------------
// Page
// -------------------------------------------------------
export default async function TerminologyPage() {
  const terms = await prisma.airIndexTerm.findMany({
    where: { isPublic: true },
    orderBy: { term: "asc" },
  });

  // Group terms by category
  const grouped: Record<string, typeof terms> = {};
  for (const term of terms) {
    const cat = term.category.toLowerCase();
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(term);
  }

  // Ordered categories
  const categoryOrder = ["infrastructure", "regulatory", "standards", "operational", "legislative"];
  const activeCategories = categoryOrder.filter((c) => grouped[c]?.length);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#ccc",
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        lineHeight: 1.7,
        overflow: "auto",
      }}
    >
      <TrackPageView page="/terminology" />

      <SiteNav />

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "48px clamp(20px, 5vw, 32px) 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: 2,
              color: "#5B8DB8",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Terminology Database
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 5vw, 36px)",
              color: "#fff",
              lineHeight: 1.2,
              marginBottom: 16,
            }}
          >
            AirIndex Terminology Reference
          </h1>
          <p style={{ color: "#777", fontSize: 15, lineHeight: 1.7, maxWidth: 640 }}>
            Source-traced, scoring-linked terminology for vertical flight infrastructure. Every term
            is traceable to a primary federal standard or regulatory document.
          </p>
          <p style={{ color: "#777", fontSize: 15, lineHeight: 1.7, maxWidth: 640, marginTop: 12 }}>
            This is not a glossary. It is the language standard that AirIndex scores against. City
            planners, legislators, infrastructure developers, and insurance carriers can use these
            definitions to ensure their documents align with FAA standards and AirIndex methodology.
          </p>
        </div>

        {/* Category navigation */}
        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 48,
            paddingBottom: 24,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {activeCategories.map((cat) => (
            <a
              key={cat}
              href={`#${cat}`}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: CATEGORY_COLORS[cat] || "#999",
                background: `${CATEGORY_COLORS[cat] || "#999"}11`,
                border: `1px solid ${CATEGORY_COLORS[cat] || "#999"}33`,
                borderRadius: 20,
                padding: "6px 14px",
                textDecoration: "none",
                transition: "opacity 0.2s",
              }}
            >
              {CATEGORY_LABELS[cat] || cat} ({grouped[cat].length})
            </a>
          ))}
        </nav>

        {/* Term sections by category */}
        {activeCategories.map((cat) => (
          <section key={cat} id={cat} style={{ marginBottom: 56 }}>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: CATEGORY_COLORS[cat] || "#fff",
                marginBottom: 24,
                paddingBottom: 12,
                borderBottom: `1px solid ${CATEGORY_COLORS[cat] || "#fff"}33`,
              }}
            >
              {CATEGORY_LABELS[cat] || cat}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {grouped[cat].map((t) => (
                <article
                  key={t.id}
                  id={t.id}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: `3px solid ${CATEGORY_COLORS[cat] || "#555"}`,
                    borderRadius: 8,
                    padding: 24,
                  }}
                >
                  {/* Term name + badges */}
                  <div style={{ marginBottom: 16 }}>
                    <h3
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#fff",
                        marginBottom: 8,
                      }}
                    >
                      {t.term}
                    </h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {/* Category badge */}
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 9,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          color: CATEGORY_COLORS[cat] || "#999",
                          background: `${CATEGORY_COLORS[cat] || "#999"}15`,
                          border: `1px solid ${CATEGORY_COLORS[cat] || "#999"}33`,
                          borderRadius: 12,
                          padding: "3px 10px",
                        }}
                      >
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                      {/* Factor code badges */}
                      {t.factorCodes.map((code) => (
                        <span
                          key={code}
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 9,
                            letterSpacing: 1,
                            color: "#5B8DB8",
                            background: "rgba(91,141,184,0.08)",
                            border: "1px solid rgba(91,141,184,0.2)",
                            borderRadius: 12,
                            padding: "3px 10px",
                          }}
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Definition */}
                  <p style={{ color: "#bbb", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
                    {t.definition}
                  </p>

                  {/* Source */}
                  <div style={{ marginBottom: 12 }}>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 9,
                        letterSpacing: 1.5,
                        color: "#555",
                        textTransform: "uppercase",
                      }}
                    >
                      Source
                    </span>
                    <p style={{ color: "#999", fontSize: 13, marginTop: 4 }}>
                      {t.sourceUrl ? (
                        <a
                          href={t.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#5B8DB8", textDecoration: "none" }}
                        >
                          {t.sourceRef}
                        </a>
                      ) : (
                        t.sourceRef
                      )}
                    </p>
                  </div>

                  {/* Incorrect alternatives */}
                  {t.incorrectAlternatives.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <span
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 9,
                          letterSpacing: 1.5,
                          color: "#555",
                          textTransform: "uppercase",
                        }}
                      >
                        Incorrect Alternatives
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                        {t.incorrectAlternatives.map((alt) => (
                          <span
                            key={alt}
                            style={{
                              fontFamily: "'Space Mono', monospace",
                              fontSize: 11,
                              color: "#ff6b6b",
                              background: "rgba(255,107,107,0.08)",
                              border: "1px solid rgba(255,107,107,0.2)",
                              borderRadius: 12,
                              padding: "3px 10px",
                              textDecoration: "line-through",
                            }}
                          >
                            {alt}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Context of use */}
                  <div style={{ marginBottom: 12 }}>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 9,
                        letterSpacing: 1.5,
                        color: "#555",
                        textTransform: "uppercase",
                      }}
                    >
                      Context of Use
                    </span>
                    <p style={{ color: "#999", fontSize: 13, marginTop: 4 }}>{t.contextOfUse}</p>
                  </div>

                  {/* Scoring implication */}
                  <div style={{ marginBottom: 8 }}>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 9,
                        letterSpacing: 1.5,
                        color: "#555",
                        textTransform: "uppercase",
                      }}
                    >
                      Scoring Implication
                    </span>
                    <p style={{ color: "#b0b0c0", fontSize: 13, marginTop: 4 }}>
                      {t.scoringImplication}
                    </p>
                  </div>

                  {/* Version badge */}
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <span
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 9,
                        letterSpacing: 1,
                        color: "#555",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        padding: "3px 10px",
                      }}
                    >
                      Added in {t.versionAdded}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {/* Empty state */}
        {terms.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "#555",
              fontSize: 15,
            }}
          >
            <p>No terms published yet. Check back soon.</p>
          </div>
        )}

        {/* Footer CTA */}
        <section
          style={{
            marginTop: 48,
            paddingTop: 32,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p style={{ color: "#777", fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
            This terminology database is maintained by Vertical Data Group as part of the AirIndex
            methodology. For corrections, additions, or questions, contact{" "}
            <a href="mailto:info@airindex.io" style={{ color: "#5B8DB8", textDecoration: "none" }}>
              info@airindex.io
            </a>
            .
          </p>

          {/* Citation block */}
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              padding: 20,
              marginBottom: 32,
            }}
          >
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                letterSpacing: 1.5,
                color: "#555",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 8,
              }}
            >
              Citation
            </span>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                color: "#999",
                lineHeight: 1.6,
              }}
            >
              Source: AirIndex Terminology Database, v1.3 (airindex.io/terminology)
            </p>
          </div>

          {/* Navigation links */}
          <div
            style={{
              display: "flex",
              gap: 24,
              fontSize: 12,
            }}
          >
            <Link href="/methodology" style={{ color: "#5B8DB8", textDecoration: "none" }}>
              Methodology
            </Link>
            <Link href="/dashboard" style={{ color: "#555", textDecoration: "none" }}>
              Dashboard
            </Link>
            <Link href="/" style={{ color: "#555", textDecoration: "none" }}>
              Back to Home
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
