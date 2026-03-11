"use client";

import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useIsMobile";

interface AuthGateProps {
  tab: string;
}

export default function AuthGate({ tab }: AuthGateProps) {
  const isMobile = useIsMobile();
  const router = useRouter();

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 20 : 40,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          textAlign: "center",
          padding: "40px 32px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          position: "relative",
        }}
      >
        {/* Gradient top border accent */}
        <div
          style={{
            position: "absolute",
            top: -1,
            left: 40,
            right: 40,
            height: 2,
            background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
            borderRadius: "2px 2px 0 0",
          }}
        />

        <img
          src="/images/logo/airindex-icon.svg"
          alt="AirIndex"
          style={{ width: 44, height: 44, margin: "0 auto 20px", display: "block" }}
        />

        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 8,
            margin: "0 0 8px",
          }}
        >
          Create your free AirIndex account
        </h2>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            color: "#666",
            fontSize: 11,
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          Get alerts, track markets, access regulatory filings.
        </p>

        <button
          onClick={() => router.push(`/login?mode=signup&callbackUrl=${encodeURIComponent(`/dashboard?tab=${tab}`)}`)}
          style={{
            padding: "13px 32px",
            background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
            border: "none",
            borderRadius: 6,
            color: "#000",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'Syne', sans-serif",
            letterSpacing: "0.08em",
            cursor: "pointer",
            transition: "opacity 0.15s",
          }}
        >
          SIGN UP FREE
        </button>

        <p style={{ color: "#666", fontSize: 9, marginTop: 20 }}>
          No password needed — sign in with a magic link.
        </p>
      </div>
    </div>
  );
}
