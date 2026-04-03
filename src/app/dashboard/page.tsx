// src/app/dashboard/page.tsx
// Dashboard route — authenticated users see the live dashboard,
// unauthenticated users see a platform preview with screenshot + features
import { Suspense } from "react";
import { auth } from "@/auth";
import { getCitiesWithOverrides, MARKET_COUNT } from "@/data/seed";
import Dashboard from "@/components/Dashboard";
import Image from "next/image";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export default async function DashboardPage() {
  const session = await auth();

  // Authenticated — show the real dashboard
  if (session?.user) {
    const cities = await getCitiesWithOverrides();
    const isAdmin = session.user.email === process.env.ADMIN_NOTIFY_EMAIL;

    return (
      <Suspense fallback={
        <div style={{ minHeight: "100vh", background: "#050508", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#555", fontSize: 13, fontFamily: "'Inter', sans-serif", letterSpacing: 2 }}>LOADING...</div>
        </div>
      }>
        <Dashboard initialCities={cities} isAdmin={isAdmin} />
      </Suspense>
    );
  }

  // Unauthenticated — show the platform preview
  const features = [
    {
      label: "Market Readiness Scores",
      desc: `${MARKET_COUNT}+ US markets scored daily. Every score change is sourced, traceable, and connected to the regulatory event that caused it.`,
    },
    {
      label: "Gap-to-Action Roadmaps",
      desc: "See exactly what actions move a market's score — which legislation to pass, which zoning to adopt, which federal programs fund each gap.",
    },
    {
      label: "Where the Money Is Moving",
      desc: "Operator deployment signals, federal program selections, and legislative momentum detected 6-18 months before consensus forms.",
    },
    {
      label: "Heliport Compliance Layer",
      desc: "5,647 FAA heliports screened against 5 compliance questions. Know which sites are compliant, conditional, or a liability risk.",
    },
    {
      label: "Score Trajectories",
      desc: "Directional momentum tracking. See which markets are accelerating, which are stalling, and what changes the trajectory.",
    },
    {
      label: "API & Data Export",
      desc: "Programmatic access to market scores, regulatory data, and score history. CSV export. Embed AirIndex intelligence into your workflow.",
    },
  ];

  return (
    <div style={{ background: "#050508", color: "#e0e0e0", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <SiteNav />

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            fontSize: 9,
            letterSpacing: 3,
            color: "#5B8DB8",
            fontFamily: "'Space Mono', monospace",
            marginBottom: 16,
          }}>
            UAM MARKET INTELLIGENCE PLATFORM
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(28px, 4vw, 38px)",
            fontWeight: 700,
            color: "#fff",
            margin: "0 0 12px",
          }}>
            The AirIndex Dashboard
          </h1>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
            Signal-to-action intelligence across {MARKET_COUNT}+ US markets.
            See where capital is flowing, what legislation is moving, and which
            infrastructure gaps close next.
          </p>
        </div>

        {/* Screenshot */}
        <div style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 80px rgba(91,141,184,0.06)",
          marginBottom: 48,
        }}>
          <Image
            src="/images/dashboard-preview.png"
            alt="AirIndex intelligence platform — market readiness scoring across 21 U.S. markets"
            width={1920}
            height={1080}
            style={{ width: "100%", height: "auto", display: "block" }}
            priority
          />
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, transparent 60%, rgba(5,5,8,0.9))",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "0 0 32px",
          }}>
            <Link
              href="/contact"
              style={{
                display: "inline-block",
                padding: "14px 32px",
                background: "#5B8DB8",
                color: "#050508",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textDecoration: "none",
                borderRadius: 6,
              }}
            >
              Request Platform Access
            </Link>
          </div>
        </div>

        {/* Features grid */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#5B8DB8" }}>
              PLATFORM CAPABILITIES
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 16 }}>
            {features.map((f) => (
              <div key={f.label} style={{
                padding: "20px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8,
              }}>
                <div style={{ color: "#ccc", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {f.label}
                </div>
                <div style={{ color: "#666", fontSize: 11, lineHeight: 1.6 }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          textAlign: "center",
          padding: "32px 0",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 12,
          }}>
            See it live
          </h2>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 20 }}>
            All data access is scoped per engagement. Tell us what you&apos;re working on.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link
              href="/contact"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                background: "#5B8DB8",
                color: "#050508",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textDecoration: "none",
                borderRadius: 6,
              }}
            >
              Talk to Us
            </Link>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                padding: "12px 28px",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#888",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textDecoration: "none",
                borderRadius: 6,
              }}
            >
              Existing Member? Sign In
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
