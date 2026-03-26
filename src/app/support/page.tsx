import type { Metadata } from "next";
import { Suspense } from "react";
import SiteNav from "@/components/SiteNav";
import SupportForm from "@/components/SupportForm";

export const metadata: Metadata = {
  title: "Support — AirIndex",
  description: "Get help with your AirIndex account, billing, or technical issues.",
};

export default function SupportPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
      }}
    >
      <SiteNav />

      {/* Header */}
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) 20px 40px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(24px, 3.5vw, 36px)",
            margin: "0 0 12px",
          }}
        >
          How can we help?
        </h1>
        <p style={{ color: "#888", fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          Billing questions, technical issues, or feedback — we&apos;re here.
        </p>
      </section>

      {/* Form */}
      <section style={{ padding: "0 20px 80px" }}>
        <Suspense fallback={null}>
          <SupportForm />
        </Suspense>
      </section>
    </div>
  );
}
