"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function GatePage() {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        setError("Wrong passphrase");
        setPassphrase("");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050508",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Space Mono', monospace",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 400,
        padding: 32,
        textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          marginBottom: 48,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
          }} />
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 26,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "0.08em",
          }}>AIRINDEX</span>
        </div>

        <p style={{
          color: "#888899",
          fontSize: 13,
          marginBottom: 32,
          lineHeight: 1.6,
        }}>
          This site is under active development.<br />
          Enter the passphrase to continue.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Passphrase"
            autoFocus
            style={{
              width: "100%",
              padding: "14px 16px",
              background: "#0a0a12",
              border: "1px solid #1a1a2e",
              borderRadius: 6,
              color: "#e0e0e8",
              fontSize: 14,
              fontFamily: "'Space Mono', monospace",
              outline: "none",
              marginBottom: 16,
            }}
          />
          <button
            type="submit"
            disabled={loading || !passphrase}
            style={{
              width: "100%",
              padding: "14px 16px",
              background: passphrase ? "linear-gradient(135deg, #00d4ff, #7c3aed)" : "#1a1a2e",
              border: "none",
              borderRadius: 6,
              color: passphrase ? "#000" : "#555",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "0.06em",
              cursor: passphrase ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            {loading ? "..." : "ENTER"}
          </button>
        </form>

        {error && (
          <p style={{
            color: "#ff4444",
            fontSize: 12,
            marginTop: 16,
          }}>{error}</p>
        )}
      </div>
    </div>
  );
}
