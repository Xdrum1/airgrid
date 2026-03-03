"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ChangeType } from "@/types";
import { trackEvent } from "@/lib/track";
import { plausible } from "@/lib/plausible";
import { hasProAccess } from "@/lib/billing-shared";

interface SubscribeFormProps {
  cityId: string;
  cityName: string;
  onSubscriptionChange?: (cityId: string, subscribed: boolean) => void;
  userTier?: string;
}

const CHANGE_TYPE_OPTIONS: { value: ChangeType; label: string }[] = [
  { value: "new_filing", label: "NEW FILING" },
  { value: "status_change", label: "STATUS CHANGE" },
  { value: "new_law", label: "NEW LAW" },
  { value: "faa_update", label: "FAA UPDATE" },
];

const LS_SUB_PREFIX = "airgrid_sub_";

type FormState = "collapsed" | "expanded" | "submitting" | "success";

export default function SubscribeForm({ cityId, cityName, onSubscriptionChange, userTier = "free" }: SubscribeFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [state, setState] = useState<FormState>("collapsed");
  const [selectedTypes, setSelectedTypes] = useState<ChangeType[]>([
    "new_filing",
    "status_change",
    "new_law",
    "faa_update",
  ]);
  const [allCities, setAllCities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);

  // Check subscription status on mount / city change
  useEffect(() => {
    const cached = localStorage.getItem(LS_SUB_PREFIX + cityId);
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
    setAllCities(false);
    setSelectedTypes(["new_filing", "status_change", "new_law", "faa_update"]);
  }, [cityId]);

  const toggleType = useCallback((type: ChangeType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const handleSubscribe = async () => {
    if (!session?.user) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/dashboard?tab=map")}`);
      return;
    }

    if (selectedTypes.length === 0) {
      setError("Select at least one alert type");
      return;
    }

    setState("submitting");
    setError(null);

    try {
      const cityIds = allCities ? [] : [cityId];
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityIds, changeTypes: selectedTypes }),
      });

      const json = await res.json();

      if (!res.ok) {
        setState("expanded");
        setError(
          res.status === 409
            ? "You're already subscribed to these alerts"
            : json.error || "Something went wrong"
        );
        return;
      }

      localStorage.setItem(
        LS_SUB_PREFIX + cityId,
        JSON.stringify({ id: json.data.id })
      );
      setSubId(json.data.id);
      setState("success");
      onSubscriptionChange?.(cityId, true);
      trackEvent("alert_subscribe", "city", cityId, { allCities, changeTypes: selectedTypes });
      plausible("Alert Subscribe", { city: cityId });
    } catch {
      setState("expanded");
      setError("Network error — try again");
    }
  };

  const handleUnsubscribe = async () => {
    if (!subId) return;
    try {
      const res = await fetch(`/api/subscribe/${subId}`, { method: "DELETE" });
      if (res.ok) {
        localStorage.removeItem(LS_SUB_PREFIX + cityId);
        setSubId(null);
        setState("collapsed");
        onSubscriptionChange?.(cityId, false);
        trackEvent("alert_unsubscribe", "city", cityId);
        plausible("Alert Unsubscribe", { city: cityId });
      }
    } catch {
      // silent fail — user can retry
    }
  };

  // --- Collapsed state ---
  if (state === "collapsed") {
    // Show upgrade prompt for authenticated free users
    if (session?.user && !hasProAccess(userTier)) {
      return (
        <div>
          <div
            style={{
              color: "#777",
              fontSize: 8,
              letterSpacing: 2,
              marginBottom: 10,
            }}
          >
            ALERT SUBSCRIPTIONS
          </div>
          <Link
            href="/pricing"
            style={{
              width: "100%",
              background: "rgba(0,255,136,0.04)",
              border: "1px solid rgba(0,255,136,0.15)",
              borderRadius: 6,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: "'Space Mono', monospace",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
          >
            <span style={{ color: "#888", fontSize: 10 }}>
              Upgrade to Pro for alerts
            </span>
            <span
              style={{
                color: "#00ff88",
                fontSize: 8,
                letterSpacing: 1,
                fontFamily: "'Space Mono', monospace",
              }}
            >
              VIEW PLANS
            </span>
          </Link>
        </div>
      );
    }

    return (
      <div>
        <div
          style={{
            color: "#777",
            fontSize: 8,
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          ALERT SUBSCRIPTIONS
        </div>
        <button
          onClick={() => {
            if (!session?.user) {
              router.push(`/login?callbackUrl=${encodeURIComponent("/dashboard?tab=map")}`);
              return;
            }
            setState("expanded");
          }}
          style={{
            width: "100%",
            background: "rgba(0,255,136,0.06)",
            border: "1px solid rgba(0,255,136,0.2)",
            borderRadius: 6,
            padding: "10px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "'Space Mono', monospace",
            transition: "all 0.15s",
          }}
        >
          <span style={{ color: "#888", fontSize: 10 }}>
            {session?.user ? `Get alerts for ${cityName}` : "Sign up to get alerts"}
          </span>
          <span
            style={{
              color: "#00ff88",
              fontSize: 8,
              letterSpacing: 1,
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {session?.user ? "SUBSCRIBE" : "SIGN IN"}
          </span>
        </button>
      </div>
    );
  }

  // --- Success state ---
  if (state === "success") {
    return (
      <div style={{ animation: "fadeSlideIn 0.25s ease" }}>
        <div
          style={{
            color: "#777",
            fontSize: 8,
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          ALERT SUBSCRIPTIONS
        </div>
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
              Subscribed
            </span>
          </div>
          <div style={{ color: "#555", fontSize: 9, marginBottom: 8 }}>
            {session?.user?.email ?? "You"} will receive alerts for {cityName}
          </div>
          <button
            onClick={handleUnsubscribe}
            style={{
              background: "transparent",
              border: "none",
              color: "#444",
              fontSize: 8,
              cursor: "pointer",
              padding: 0,
              fontFamily: "'Space Mono', monospace",
              letterSpacing: 1,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ff4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
          >
            UNSUBSCRIBE
          </button>
        </div>
      </div>
    );
  }

  // --- Expanded / Submitting state ---
  const isSubmitting = state === "submitting";

  return (
    <div style={{ animation: "fadeSlideIn 0.25s ease" }}>
      <div
        style={{
          color: "#2a2a3a",
          fontSize: 8,
          letterSpacing: 2,
          marginBottom: 10,
        }}
      >
        ALERT SUBSCRIPTIONS
      </div>

      {/* Logged-in user indicator */}
      {session?.user?.email && (
        <div
          style={{
            color: "#555",
            fontSize: 9,
            marginBottom: 10,
            padding: "8px 12px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 5,
          }}
        >
          Subscribing as {session.user.email}
        </div>
      )}

      {/* Change type chips */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
        {CHANGE_TYPE_OPTIONS.map(({ value, label }) => {
          const active = selectedTypes.includes(value);
          return (
            <button
              key={value}
              onClick={() => toggleType(value)}
              disabled={isSubmitting}
              style={{
                background: active ? "rgba(0,255,136,0.1)" : "transparent",
                border: active
                  ? "1px solid rgba(0,255,136,0.3)"
                  : "1px solid rgba(255,255,255,0.07)",
                color: active ? "#00ff88" : "#444",
                borderRadius: 3,
                padding: "4px 7px",
                fontSize: 7,
                letterSpacing: 1,
                cursor: isSubmitting ? "default" : "pointer",
                fontFamily: "'Space Mono', monospace",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* All cities checkbox */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          cursor: isSubmitting ? "default" : "pointer",
        }}
      >
        <div
          onClick={() => !isSubmitting && setAllCities(!allCities)}
          style={{
            width: 14,
            height: 14,
            borderRadius: 3,
            border: allCities
              ? "1px solid rgba(0,255,136,0.4)"
              : "1px solid rgba(255,255,255,0.1)",
            background: allCities ? "rgba(0,255,136,0.15)" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          {allCities && (
            <span style={{ color: "#00ff88", fontSize: 9, lineHeight: 1 }}>
              ✓
            </span>
          )}
        </div>
        <span style={{ color: "#555", fontSize: 9 }}>
          Also alert me for ALL cities
        </span>
      </label>

      {/* Error */}
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

      {/* Submit */}
      <button
        onClick={handleSubscribe}
        disabled={isSubmitting}
        style={{
          width: "100%",
          background: isSubmitting
            ? "rgba(0,255,136,0.08)"
            : "rgba(0,255,136,0.12)",
          border: "1px solid rgba(0,255,136,0.3)",
          borderRadius: 5,
          padding: "9px 14px",
          color: "#00ff88",
          fontSize: 9,
          letterSpacing: 1,
          fontWeight: 700,
          cursor: isSubmitting ? "default" : "pointer",
          fontFamily: "'Space Mono', monospace",
          transition: "all 0.15s",
          opacity: isSubmitting ? 0.6 : 1,
        }}
      >
        {isSubmitting ? "SUBSCRIBING..." : "SUBSCRIBE"}
      </button>
    </div>
  );
}
