"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function CheckoutReturn() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    fetch(`/api/checkout/status?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "complete") {
          setStatus("success");
          // Redirect to dashboard after short delay
          setTimeout(() => {
            router.push("/dashboard?checkout=success");
          }, 3000);
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [sessionId, router]);

  if (status === "loading") {
    return (
      <div style={{ color: "#555", fontSize: 13, letterSpacing: 2 }}>
        VERIFYING PAYMENT...
      </div>
    );
  }

  if (status === "error") {
    return (
      <>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(255,68,68,0.1)",
            border: "1px solid rgba(255,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: 26,
          }}
        >
          !
        </div>
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: "#fff",
            marginBottom: 12,
          }}
        >
          Something went wrong
        </div>
        <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          We couldn&apos;t verify your payment. If you were charged, your subscription will
          still be activated — check your dashboard in a few minutes.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            background: "rgba(91,141,184,0.1)",
            border: "1px solid rgba(91,141,184,0.3)",
            color: "#5B8DB8",
            fontWeight: 600,
            fontSize: 13,
            padding: "12px 28px",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Go to Dashboard
        </Link>
      </>
    );
  }

  return (
    <>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgba(0,255,136,0.1)",
          border: "1px solid rgba(0,255,136,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 26,
          color: "#00ff88",
        }}
      >
        &#10003;
      </div>
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 22,
          color: "#fff",
          marginBottom: 12,
        }}
      >
        Welcome to AirIndex
      </div>
      <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
        Your subscription is active. Redirecting to your dashboard...
      </p>
      <p style={{ color: "#444", fontSize: 11 }}>
        Not redirecting?{" "}
        <Link
          href="/dashboard?checkout=success"
          style={{ color: "#5B8DB8", textDecoration: "none" }}
        >
          Click here
        </Link>
      </p>
    </>
  );
}
