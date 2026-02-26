"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CheckEmailPage() {
  const router = useRouter();

  // Redirect to login page — code entry happens there now
  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050508",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Space Mono', monospace",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400, padding: 32, textAlign: "center" }}>
        <p style={{ color: "#888899", fontSize: 12 }}>Redirecting...</p>
      </div>
    </div>
  );
}
