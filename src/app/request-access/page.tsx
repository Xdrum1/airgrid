import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import RequestAccessForm from "@/components/RequestAccessForm";
import TrackPageView from "@/components/TrackPageView";

export const metadata: Metadata = {
  title: "Request Access — AirIndex",
  description:
    "Request early access to the full AirIndex UAM intelligence platform — score breakdowns, corridors, operator tracking, and curated intel.",
};

export default function RequestAccessPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Space Mono', monospace",
        color: "#fff",
      }}
    >
      <TrackPageView page="/request-access" />
      <SiteNav />

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 3,
              color: "#7c3aed",
              marginBottom: 16,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            EARLY ACCESS
          </div>
          <h1
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(22px, 3vw, 32px)",
              margin: "0 0 12px",
              color: "#fff",
              letterSpacing: -0.5,
            }}
          >
            Get Full Access
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#888",
              lineHeight: 1.6,
              margin: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Unlock the complete UAM Intel Feed, score breakdowns, corridor intelligence,
            and operator tracking across 20+ US markets.
          </p>
        </div>

        <RequestAccessForm />
      </div>

      <SiteFooter />
    </div>
  );
}
