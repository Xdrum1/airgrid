import type { Metadata } from "next";
import { Suspense } from "react";
import SiteNav from "@/components/SiteNav";
import EmbeddedCheckoutForm from "@/components/EmbeddedCheckoutForm";

export const metadata: Metadata = {
  title: "Checkout — AirIndex",
  description: "Complete your AirIndex subscription.",
};

export default function CheckoutPage() {
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
          maxWidth: 600,
          margin: "0 auto",
          padding: "clamp(32px, 4vw, 56px) 20px clamp(60px, 8vw, 100px)",
        }}
      >
        <Suspense
          fallback={
            <div style={{ textAlign: "center", padding: "80px 0", color: "#555", fontSize: 13, letterSpacing: 2 }}>
              LOADING CHECKOUT...
            </div>
          }
        >
          <EmbeddedCheckoutForm />
        </Suspense>
      </section>
    </div>
  );
}
