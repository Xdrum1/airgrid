"use client";

import { useState } from "react";

interface CheckoutSuccessModalProps {
  tierName: string;
  onDismiss: () => void;
}

export default function CheckoutSuccessModal({
  tierName,
  onDismiss,
}: CheckoutSuccessModalProps) {
  const [referral, setReferral] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (referral.trim()) {
      setSaving(true);
      try {
        await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referralSource: referral.trim() }),
        });
      } catch {
        // Non-blocking
      }
    }
    onDismiss();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(5,5,8,0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#0a0a12",
          border: "1px solid rgba(0,212,255,0.15)",
          borderRadius: 12,
          padding: "36px 32px 28px",
          maxWidth: 420,
          width: "100%",
          margin: "0 16px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(0,212,255,0.1)",
            border: "1px solid rgba(0,212,255,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 22,
          }}
        >
          &#10003;
        </div>

        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 20,
            color: "#fff",
            marginBottom: 8,
          }}
        >
          Welcome to {tierName}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#888",
            lineHeight: 1.6,
            marginBottom: 28,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Your subscription is active. You now have full access to the AirIndex intelligence platform.
        </div>

        <div style={{ marginBottom: 24, textAlign: "left" }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              color: "#777",
              marginBottom: 4,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            How did you hear about AirIndex? (optional)
          </label>
          <input
            type="text"
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
            maxLength={500}
            placeholder="e.g. LinkedIn, Aviation Week, colleague referral..."
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: "#ddd",
              fontSize: 13,
              fontFamily: "'Inter', sans-serif",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            width: "100%",
            padding: "14px 0",
            background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
            border: "none",
            borderRadius: 6,
            color: "#000",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.04em",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {saving ? "Saving..." : "Start exploring"}
        </button>
      </div>
    </div>
  );
}
