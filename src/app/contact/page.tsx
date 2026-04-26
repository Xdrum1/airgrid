"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { plausible } from "@/lib/plausible";
import NavClient from "@/components/NavClient";
import SiteFooter from "@/components/SiteFooter";
import { getProduct, PRODUCTS, CONTAINER_ORDER, type Product } from "@/lib/products";

function ContactForm() {
  const searchParams = useSearchParams();
  const inquiry = searchParams.get("inquiry") ?? "";
  const ref = searchParams.get("ref") ?? "";
  const buyer = searchParams.get("buyer") ?? "";
  const productParam = searchParams.get("product") ?? "";

  const initialProduct: Product | undefined = productParam ? getProduct(productParam) : undefined;

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    tier: inquiry || "general",
    buyerType: buyer || initialProduct?.container || "",
    productId: initialProduct?.id || "",
    message: "",
    website: "", // honeypot — bots fill this, humans don't see it
  });
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setState("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          source: ref || undefined,
          buyerType: form.buyerType || undefined,
          productId: form.productId || undefined,
        }),
      });
      if (res.ok) {
        setState("success");
        plausible("Contact Submission", { tier: form.tier, productId: form.productId || "none" });
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  };

  const inquiryLocked = !!inquiry;
  const productLocked = !!initialProduct;

  if (state === "success") {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16, color: "#0d9488" }}>&#10003;</div>
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 24,
            marginBottom: 12,
            color: "#0a2540",
          }}
        >
          Inquiry received
        </h2>
        <p style={{ color: "#425466", fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
          We&apos;ll review your inquiry and reach out within 48 hours.
        </p>
        <Link
          href="/dashboard"
          style={{
            color: "#0a4068",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Go to Dashboard →
        </Link>
      </div>
    );
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    background: "#ffffff",
    border: "1px solid #e3e8ee",
    borderRadius: 6,
    color: "#0a2540",
    fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    color: "#425466",
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 6,
  };

  // Group orderable products by container for the dropdown
  const orderableProducts = PRODUCTS.filter((p) => p.status !== "coming_soon");
  const productGroups = CONTAINER_ORDER.map((container) => ({
    container,
    label: orderableProducts.find((p) => p.container === container)?.containerLabel ?? "",
    products: orderableProducts.filter((p) => p.container === container),
  })).filter((g) => g.products.length > 0);

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480, margin: "0 auto" }}>
      {initialProduct && (
        <div
          style={{
            background: "#f0f9ff",
            border: `1px solid ${initialProduct.accent}33`,
            borderLeft: `3px solid ${initialProduct.accent}`,
            borderRadius: 6,
            padding: "12px 14px",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 9, letterSpacing: 2, color: initialProduct.accent, fontFamily: "'Space Mono', monospace", marginBottom: 4, textTransform: "uppercase" }}>
            Inquiring About
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0a2540", marginBottom: 2 }}>
            {initialProduct.name}
          </div>
          <div style={{ fontSize: 11, color: "#697386" }}>
            {initialProduct.price}{initialProduct.priceNote ? ` · ${initialProduct.priceNote}` : ""}{initialProduct.turnaround ? ` · ${initialProduct.turnaround}` : ""}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>NAME *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            style={inputStyle}
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label style={labelStyle}>WORK EMAIL *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            style={inputStyle}
            placeholder="jane@company.com"
          />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>COMPANY</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            style={inputStyle}
            placeholder="Acme Aviation"
          />
        </div>
        <div>
          <label style={labelStyle}>ROLE</label>
          <input
            type="text"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            style={inputStyle}
            placeholder="Strategy Analyst"
          />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>WHICH PRODUCT?</label>
        <select
          value={form.productId}
          onChange={(e) => {
            const next = e.target.value;
            const p = next ? getProduct(next) : undefined;
            setForm({
              ...form,
              productId: next,
              // Auto-set buyerType from product container if user hasn't set one
              buyerType: form.buyerType || p?.container || "",
            });
          }}
          disabled={productLocked}
          style={{
            ...inputStyle,
            appearance: "none",
            cursor: productLocked ? "default" : "pointer",
            opacity: productLocked ? 0.7 : 1,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            paddingRight: 36,
          }}
        >
          <option value="">Not sure / general inquiry</option>
          {productGroups.map((group) => (
            <optgroup key={group.container} label={group.label}>
              {group.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price}{p.priceNote ? ` ${p.priceNote}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>INQUIRY TYPE</label>
        <select
          value={form.tier}
          onChange={(e) => setForm({ ...form, tier: e.target.value })}
          disabled={inquiryLocked}
          style={{
            ...inputStyle,
            appearance: "none",
            cursor: inquiryLocked ? "default" : "pointer",
            opacity: inquiryLocked ? 0.7 : 1,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            paddingRight: 36,
          }}
        >
          <option value="general">General Inquiry</option>
          <option value="data-license">Data License</option>
          <option value="market-report">Market Intelligence Report</option>
          <option value="heliport-audit">Heliport Infrastructure Audit</option>
          <option value="api-access">API Access</option>
          <option value="partnership">Partnership / Data Exchange</option>
          <option value="press">Press / Research</option>
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>I AM A</label>
        <select
          value={form.buyerType}
          onChange={(e) => setForm({ ...form, buyerType: e.target.value })}
          style={{
            ...inputStyle,
            appearance: "none",
            cursor: "pointer",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239ca3af' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            paddingRight: 36,
          }}
        >
          <option value="">Select your role</option>
          <option value="infra-developer">Infrastructure Developer / Investor</option>
          <option value="operator">eVTOL / AAM Operator</option>
          <option value="municipality">City Planner / Municipality / State Agency</option>
          <option value="airport-authority">Airport Authority</option>
          <option value="heliport-owner">Heliport or Vertiport Owner</option>
          <option value="insurance">Insurance Carrier / Underwriter</option>
          <option value="federal">Federal Agency / DOT</option>
          <option value="economic-dev">Economic Development Alliance</option>
          <option value="defense">Defense / Aerospace</option>
          <option value="weather-sensor">Weather / Sensor Provider</option>
          <option value="academia">Academia / Research</option>
          <option value="press">Press / Media</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>WHAT ARE YOU WORKING ON?</label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={3}
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
          placeholder="What are you looking to use AirIndex for?"
        />
      </div>
      {/* Honeypot — hidden from humans, bots auto-fill it */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", height: 0, overflow: "hidden", tabIndex: -1 } as React.CSSProperties}>
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
      </div>
      <button
        type="submit"
        disabled={state === "submitting" || !form.name.trim() || !form.email.trim()}
        style={{
          width: "100%",
          padding: "14px 0",
          background: state === "submitting" ? "#cbd5e1" : "#0a2540",
          border: "none",
          borderRadius: 8,
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.02em",
          cursor: state === "submitting" ? "default" : "pointer",
          transition: "opacity 0.15s",
        }}
      >
        {state === "submitting" ? "Sending..." : "Send Inquiry"}
      </button>
      <p style={{ color: "#8792a2", fontSize: 10, marginTop: 12, textAlign: "center", lineHeight: 1.5 }}>
        By submitting, you agree to our{" "}
        <a href="/terms" style={{ color: "#5B8DB8", textDecoration: "none" }}>Terms of Service</a> and{" "}
        <a href="/privacy" style={{ color: "#5B8DB8", textDecoration: "none" }}>Privacy Policy</a>. You may receive
        the monthly UAM Market Pulse and product updates. You can unsubscribe at any time.
      </p>
      {state === "error" && (
        <div style={{ color: "#dc2626", fontSize: 11, marginTop: 12, textAlign: "center" }}>
          Something went wrong. Try emailing hello@airindex.io directly.
        </div>
      )}
    </form>
  );
}

export default function ContactPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter', sans-serif",
        color: "#0a2540",
      }}
    >
      {/* Client page can't use async SiteNav, so render NavClient directly.
          Spacer matches the fixed 64px nav height. */}
      <nav
        className="nav-light"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(10,37,64,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 20px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo/airindex-wordmark-light.svg" alt="AirIndex" style={{ height: 28 }} />
          </Link>
          <NavClient isAuthed={false} theme="light" />
        </div>
      </nav>
      <div style={{ height: 64 }} />

      {/* Header */}
      <div
        style={{
          background: "linear-gradient(180deg, rgba(91,141,184,0.08) 0%, rgba(91,141,184,0) 60%)",
        }}
      >
        <section style={{ maxWidth: 1120, margin: "0 auto", padding: "clamp(48px, 7vw, 88px) 20px 40px", textAlign: "center" }}>
          <div style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "#5B8DB8",
            fontFamily: "'Space Mono', monospace",
            marginBottom: 16,
            textTransform: "uppercase",
          }}>
            Data Licenses · Reports · API · Partnerships
          </div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 4vw, 44px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: "0 0 16px",
              color: "#0a2540",
            }}
          >
            Talk to us.
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", color: "#425466", fontSize: 16, margin: 0, lineHeight: 1.6, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            Tell us what you&apos;re working on and we&apos;ll reach out within 48 hours.
            All data access is negotiated &mdash; no self-serve checkout.
          </p>
        </section>
      </div>

      {/* Form + Direct Contact side by side */}
      <section style={{ maxWidth: 840, margin: "0 auto", padding: "32px 20px 96px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 48,
            alignItems: "start",
            background: "#ffffff",
            border: "1px solid #e3e8ee",
            borderRadius: 14,
            padding: "clamp(24px, 3vw, 36px)",
            boxShadow: "0 4px 12px rgba(10,37,64,0.06)",
          }}
        >
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#5B8DB8", marginBottom: 16, textTransform: "uppercase", fontFamily: "'Space Mono', monospace" }}>
              Direct Contact
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: "#697386", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>Phone</div>
              <div style={{ fontSize: 14, color: "#0a2540", fontWeight: 600 }}>(202) 949-2709</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: "#697386", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>Email</div>
              <div style={{ fontSize: 14, color: "#0a2540", fontWeight: 600 }}>sales@airindex.io</div>
            </div>
            <div style={{ borderTop: "1px solid #e3e8ee", paddingTop: 16 }}>
              <div style={{ fontSize: 10, color: "#8792a2", letterSpacing: 1, lineHeight: 1.8 }}>
                SAM.GOV REGISTERED<br />
                UEI RB63W8RYCHY3<br />
                CAGE 1AUW7
              </div>
            </div>
          </div>
          <Suspense fallback={null}>
            <ContactForm />
          </Suspense>
        </div>
      </section>

      <SiteFooter theme="light" />
    </div>
  );
}
