import type { Metadata } from "next";
import { Suspense } from "react";
import SiteNav from "@/components/SiteNav";
import CheckoutReturn from "@/components/CheckoutReturn";

export const metadata: Metadata = {
  title: "Checkout Complete — AirIndex",
  description: "Your AirIndex subscription is being activated.",
};

export default function CheckoutCompletePage() {
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
      <section
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "clamp(60px, 8vw, 120px) 20px",
          textAlign: "center",
        }}
      >
        <Suspense
          fallback={
            <div style={{ color: "#555", fontSize: 13, letterSpacing: 2 }}>
              VERIFYING PAYMENT...
            </div>
          }
        >
          <CheckoutReturn />
        </Suspense>
      </section>
    </div>
  );
}
