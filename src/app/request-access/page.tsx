import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import RequestAccessForm from "@/components/RequestAccessForm";
import TrackPageView from "@/components/TrackPageView";
import { LT, pageShell, eyebrow, h1Display, bodyLead } from "@/lib/landing-theme";

export const metadata: Metadata = {
  title: "Request Access — AirIndex",
  description:
    "Request access to the AirIndex intelligence platform — market readiness scoring, regulatory precedents, operator graph, and forward signals.",
};

export default function RequestAccessPage() {
  return (
    <div style={pageShell}>
      <TrackPageView page="/request-access" />
      <SiteNav theme="light" />

      <div
        style={{
          position: "relative",
          background:
            "linear-gradient(180deg, rgba(91,141,184,0.08) 0%, rgba(91,141,184,0) 60%)",
        }}
      >
        <div style={{ maxWidth: 620, margin: "0 auto", padding: "clamp(56px, 8vw, 96px) 24px clamp(40px, 6vw, 72px)" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={eyebrow}>Request Access</div>
            <h1 style={{ ...h1Display, fontSize: "clamp(26px, 3.6vw, 38px)" }}>
              Get access to AirIndex.
            </h1>
            <p style={{ ...bodyLead, maxWidth: 520, margin: "0 auto" }}>
              Tell us who you are and what decision you&apos;re working on. We&apos;ll send an
              invite to the container scoped to your use case. Most requests processed within
              24 hours.
            </p>
          </div>

          <div
            style={{
              background: LT.bg,
              border: `1px solid ${LT.cardBorder}`,
              borderRadius: 14,
              padding: "clamp(24px, 3vw, 36px)",
              boxShadow: LT.shadowMd,
            }}
          >
            <RequestAccessForm theme="light" />
          </div>
        </div>
      </div>

      <SiteFooter theme="light" />
    </div>
  );
}
