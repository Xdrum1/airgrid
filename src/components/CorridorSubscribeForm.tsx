"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { plausible } from "@/lib/plausible";
import { hasProAccess } from "@/lib/billing-shared";

interface CorridorSubscribeFormProps {
  corridorId: string;
  corridorName: string;
  userTier?: string;
}

const LS_COR_SUB_PREFIX = "airgrid_cor_sub_";

type FormState = "collapsed" | "submitting" | "success";

export default function CorridorSubscribeForm({
  corridorId,
  corridorName,
  userTier = "free",
}: CorridorSubscribeFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [state, setState] = useState<FormState>("collapsed");
  const [error, setError] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem(LS_COR_SUB_PREFIX + corridorId);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setSubId(parsed.id);
        setState("success");
      } catch {
        setState("collapsed");
      }
    } else {
      setState("collapsed");
    }
    setError(null);
  }, [corridorId]);

  const handleSubscribe = async () => {
    if (!session?.user) {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(`/corridor/${corridorId}`)}`
      );
      return;
    }

    setState("submitting");
    setError(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityIds: [],
          corridorIds: [corridorId],
          changeTypes: ["status_change", "faa_update"],
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setState("collapsed");
        setError(
          res.status === 409
            ? "Already tracking this corridor"
            : json.error || "Something went wrong"
        );
        return;
      }

      localStorage.setItem(
        LS_COR_SUB_PREFIX + corridorId,
        JSON.stringify({ id: json.data.id })
      );
      setSubId(json.data.id);
      setState("success");
      plausible("Corridor Subscribe", { corridor: corridorId });
    } catch {
      setState("collapsed");
      setError("Network error — try again");
    }
  };

  const handleUnsubscribe = async () => {
    if (!subId) return;
    try {
      const res = await fetch(`/api/subscribe/${subId}`, { method: "DELETE" });
      if (res.ok) {
        localStorage.removeItem(LS_COR_SUB_PREFIX + corridorId);
        setSubId(null);
        setState("collapsed");
        plausible("Corridor Unsubscribe", { corridor: corridorId });
      }
    } catch {
      // silent fail
    }
  };

  if (state === "success") {
    return (
      <div style={{ animation: "fadeSlideIn 0.25s ease" }}>
        <div
          style={{
            background: "rgba(0,255,136,0.05)",
            border: "1px solid rgba(0,255,136,0.15)",
            borderRadius: 6,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#00ff88",
                boxShadow: "0 0 4px #00ff88",
              }}
            />
            <span style={{ color: "#00ff88", fontSize: 10, fontWeight: 700 }}>
              Tracking
            </span>
          </div>
          <div style={{ color: "#888", fontSize: 9, marginBottom: 8 }}>
            You&apos;ll be notified when {corridorName} status changes
          </div>
          <button
            onClick={handleUnsubscribe}
            style={{
              background: "transparent",
              border: "none",
              color: "#777",
              fontSize: 8,
              cursor: "pointer",
              padding: 0,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: 1,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ff4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
          >
            STOP TRACKING
          </button>
        </div>
      </div>
    );
  }

  const isSubmitting = state === "submitting";

  // Show upgrade prompt for authenticated free users
  if (session?.user && !hasProAccess(userTier)) {
    return (
      <div>
        <Link
          href="/pricing"
          style={{
            width: "100%",
            background: "rgba(0,212,255,0.04)",
            border: "1px solid rgba(0,212,255,0.15)",
            borderRadius: 6,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: "'Inter', sans-serif",
            textDecoration: "none",
            transition: "all 0.15s",
          }}
        >
          <span style={{ color: "#00d4ff", fontSize: 9, letterSpacing: 1, fontWeight: 700 }}>
            UPGRADE TO TRACK
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          style={{
            color: "#ff4444",
            fontSize: 9,
            marginBottom: 8,
            padding: "6px 10px",
            background: "rgba(255,68,68,0.06)",
            border: "1px solid rgba(255,68,68,0.15)",
            borderRadius: 4,
          }}
        >
          {error}
        </div>
      )}
      <button
        onClick={handleSubscribe}
        disabled={isSubmitting}
        style={{
          width: "100%",
          background: isSubmitting
            ? "rgba(0,212,255,0.06)"
            : "rgba(0,212,255,0.1)",
          border: "1px solid rgba(0,212,255,0.25)",
          borderRadius: 6,
          padding: "10px 14px",
          cursor: isSubmitting ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontFamily: "'Inter', sans-serif",
          transition: "all 0.15s",
          opacity: isSubmitting ? 0.6 : 1,
        }}
      >
        <span style={{ color: "#00d4ff", fontSize: 9, letterSpacing: 1, fontWeight: 700 }}>
          {isSubmitting
            ? "SUBSCRIBING..."
            : session?.user
            ? "TRACK CORRIDOR"
            : "SIGN IN TO TRACK"}
        </span>
      </button>
    </div>
  );
}
