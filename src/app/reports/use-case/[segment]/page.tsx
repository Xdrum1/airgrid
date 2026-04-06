import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  USE_CASE_DATA,
  getAllUseCaseSegments,
  getUseCaseBySegment,
} from "@/data/use-case-content";
import PrintButton from "../../gap/[cityId]/PrintButton";

export function generateStaticParams() {
  return getAllUseCaseSegments().map((segment) => ({ segment }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ segment: string }>;
}): Promise<Metadata> {
  const { segment } = await params;
  const uc = getUseCaseBySegment(segment);
  if (!uc) return { title: "Use Case — AirIndex" };
  return {
    title: `${uc.title} — AirIndex Use Case`,
    description: uc.subtitle,
    robots: "noindex, nofollow",
  };
}

export default async function UseCaseReportPage({
  params,
}: {
  params: Promise<{ segment: string }>;
}) {
  const { segment } = await params;
  const uc = getUseCaseBySegment(segment);
  if (!uc) notFound();

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const S = {
    page: {
      background: "#fff",
      color: "#111",
      minHeight: "100vh",
      fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
      fontSize: 13,
      lineHeight: 1.6,
    } as React.CSSProperties,
    main: {
      maxWidth: 760,
      margin: "0 auto",
      padding: "32px 40px 60px",
    } as React.CSSProperties,
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      borderBottom: "1px solid #ddd",
      paddingBottom: 8,
      marginBottom: 32,
      fontSize: 10,
      color: "#999",
    } as React.CSSProperties,
    badge: {
      display: "inline-block",
      padding: "6px 20px",
      background: uc.color,
      color: "#fff",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.12em",
      borderRadius: 4,
      marginBottom: 16,
    } as React.CSSProperties,
    h1: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 32,
      fontWeight: 700,
      color: "#111",
      margin: "0 0 8px",
      lineHeight: 1.2,
    } as React.CSSProperties,
    subtitle: {
      fontSize: 14,
      color: "#777",
      lineHeight: 1.7,
      marginBottom: 24,
    } as React.CSSProperties,
    introBox: {
      padding: "20px 24px",
      borderLeft: `4px solid ${uc.color}`,
      background: "#f8f9fa",
      fontSize: 13,
      lineHeight: 1.7,
      color: "#333",
      marginBottom: 28,
    } as React.CSSProperties,
    sectionHead: {
      background: uc.color,
      color: "#fff",
      padding: "10px 20px",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.08em",
      borderRadius: "6px 6px 0 0",
      marginBottom: 0,
    } as React.CSSProperties,
    card: {
      border: "1px solid #e5e7eb",
      borderRadius: "0 0 6px 6px",
      padding: "20px 24px",
      marginBottom: 24,
    } as React.CSSProperties,
    statsGrid: {
      display: "grid",
      gridTemplateColumns: `repeat(${Math.min(uc.stats.length, 4)}, 1fr)`,
      gap: 16,
      textAlign: "center" as const,
      padding: "16px 0",
    } as React.CSSProperties,
    statValue: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: 28,
      fontWeight: 700,
      color: uc.color,
      lineHeight: 1,
    } as React.CSSProperties,
    statLabel: {
      fontSize: 10,
      fontWeight: 700,
      color: "#333",
      marginTop: 6,
    } as React.CSSProperties,
    statSub: {
      fontSize: 9,
      color: "#999",
      marginTop: 2,
    } as React.CSSProperties,
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: 12,
      lineHeight: 1.6,
    } as React.CSSProperties,
    th: {
      background: uc.color,
      color: "#fff",
      padding: "8px 12px",
      textAlign: "left" as const,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.04em",
    } as React.CSSProperties,
    td: {
      padding: "10px 12px",
      borderBottom: "1px solid #eee",
      verticalAlign: "top" as const,
    } as React.CSSProperties,
    tdAccent: {
      padding: "10px 12px",
      borderBottom: "1px solid #eee",
      verticalAlign: "top" as const,
      color: uc.color,
      fontWeight: 600,
      fontSize: 12,
    } as React.CSSProperties,
    specialBox: {
      background: "#1a1a2e",
      color: "#fff",
      padding: "20px 24px",
      borderRadius: 6,
      marginBottom: 24,
      fontSize: 13,
      lineHeight: 1.7,
    } as React.CSSProperties,
    ctaBox: {
      background: "#f0f4f8",
      border: "1px solid #ddd",
      borderRadius: 6,
      padding: "16px 24px",
      fontSize: 13,
      lineHeight: 1.7,
      color: "#333",
      marginTop: 8,
    } as React.CSSProperties,
    footer: {
      fontSize: 10,
      color: "#999",
      textAlign: "center" as const,
      borderTop: "1px solid #ddd",
      paddingTop: 16,
      marginTop: 40,
    } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0.6in; size: letter; }
        }
      `}</style>

      {/* Screen-only nav */}
      <div className="no-print" style={{ padding: "12px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", maxWidth: 760, margin: "0 auto" }}>
        <Link href="/use-cases" style={{ color: "#999", fontSize: 12, textDecoration: "none" }}>
          ← Use Cases
        </Link>
        <PrintButton />
      </div>

      <main style={S.main}>
        {/* Header */}
        <div style={S.header}>
          <span><strong>AIRINDEX</strong> &nbsp; UAM Market Intelligence &middot; airindex.io</span>
          <span>USE CASE &middot; {today.toUpperCase()}</span>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={S.badge}>USE CASE {uc.number}</div>
          <h1 style={S.h1}>{uc.title}</h1>
          <p style={S.subtitle}>{uc.subtitle}</p>
        </div>

        {/* Intro callout */}
        <div style={S.introBox}>{uc.intro}</div>

        {/* The Problem */}
        <div style={S.sectionHead}>THE PROBLEM</div>
        <div style={S.card}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#444" }}>{uc.problem}</p>
        </div>

        {/* Stats */}
        <div style={S.sectionHead}>WHAT AIRINDEX PROVIDES</div>
        <div style={S.card}>
          <div style={S.statsGrid}>
            {uc.stats.map((s) => (
              <div key={s.label}>
                <div style={S.statValue}>{s.value}</div>
                <div style={S.statLabel}>{s.label}</div>
                <div style={S.statSub}>{s.sublabel}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How the engagement works */}
        <p style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>How the engagement works</p>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 30 }}>Step</th>
              <th style={{ ...S.th, width: 90 }}>Who</th>
              <th style={S.th}>What happens</th>
              <th style={{ ...S.th, width: 140 }}>Output</th>
            </tr>
          </thead>
          <tbody>
            {uc.steps.map((step) => (
              <tr key={step.step}>
                <td style={{ ...S.td, color: uc.color, fontWeight: 700, fontSize: 16 }}>{step.step}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>{step.who}</td>
                <td style={S.td}>{step.action}</td>
                <td style={S.tdAccent}>{step.output}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Special section */}
        {uc.specialSection && (
          <div style={{ ...S.specialBox, marginTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 12, color: uc.color === "#4338ca" ? "#a5b4fc" : "#f59e0b" }}>
              {uc.specialSection.title.toUpperCase()}
            </div>
            {uc.specialSection.body.split("\n\n").map((p, i) => (
              <p key={i} style={{ margin: `0 0 ${i < uc.specialSection!.body.split("\n\n").length - 1 ? "12px" : "0"}` }}>
                {p}
              </p>
            ))}
          </div>
        )}

        {/* How to Engage */}
        <div style={{ ...S.sectionHead, marginTop: 24 }}>HOW TO ENGAGE</div>
        <div style={S.card}>
          <table style={S.table}>
            <tbody>
              {uc.engagements.map((e) => (
                <tr key={e.product}>
                  <td style={{ ...S.td, fontWeight: 700, width: 180, fontSize: 12 }}>{e.product}</td>
                  <td style={S.td}>{e.description}</td>
                  <td style={{ ...S.tdAccent, width: 100 }}>{e.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div style={S.ctaBox}>{uc.cta}</div>

        {/* Footer */}
        <div style={S.footer}>
          Vertical Data Group, LLC &middot; sales@airindex.io &middot; airindex.io
        </div>
      </main>
    </div>
  );
}
