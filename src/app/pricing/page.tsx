import Link from "next/link";
import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import {
  PRODUCTS,
  CONTAINER_ORDER,
  CONTAINER_LABELS,
  STATUS_LABELS,
  type Product,
  type ProductContainer,
} from "@/lib/products";

export const metadata: Metadata = {
  title: "Products & Pricing — AirIndex",
  description:
    "Market readiness intelligence for the buyers shaping where eVTOL operates — insurance, infrastructure, operators, municipalities, investors, and federal.",
};

const FAQS = [
  {
    q: "How does pricing work?",
    a: "Every product has a price band — what you see here. Final pricing is set in scoping based on number of facilities, markets, or jurisdictions. We don't run self-serve checkout — every engagement starts with a 30-minute scoping call.",
  },
  {
    q: "What's a 'container'?",
    a: "We organize products by buyer type — insurance underwriters, infrastructure developers, operators, municipalities, investors, federal. The same readiness data feeds every container, but each gets a deliverable framed for the questions their buyers actually ask.",
  },
  {
    q: "What's the difference between a Briefing and an Assessment?",
    a: "Briefings are market-level — readiness, gap analysis, regulatory trajectory, and recommendations for an entire city or state. Assessments are site-level — facility-by-facility risk, compliance, and exposure scoring. Briefings inform strategy. Assessments inform underwriting and engineering.",
  },
  {
    q: "How often is the data updated?",
    a: "The AirIndex pipeline runs daily. Score changes, regulatory signals, and legislative updates are detected and reflected within 24 hours. Briefings include 12-month platform access so you see updates as they happen.",
  },
  {
    q: "What data sources does AirIndex use?",
    a: "Exclusively primary government and regulatory sources — federal agencies, state legislatures, FAA registries, regulatory filings, and partner data agreements. Every score is auditable and traceable to its origin records.",
  },
] as const;

function ProductCard({ product }: { product: Product }) {
  const isLive = product.status === "live";
  const ctaHref = isLive && product.sampleRoute
    ? product.sampleRoute
    : `/contact?product=${product.id}&ref=pricing`;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e3e8ee",
        borderTop: `3px solid ${product.accent}`,
        borderRadius: 10,
        padding: "24px 24px 22px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: "0 1px 3px rgba(10,37,64,0.04)",
      }}
    >
      {product.badge && (
        <span
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            fontFamily: "'Space Mono', monospace",
            fontSize: 8,
            letterSpacing: 1.5,
            color: "#050508",
            background: product.accent,
            padding: "3px 8px",
            borderRadius: 3,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          {product.badge}
        </span>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
            letterSpacing: 1.5,
            color: "#8792a2",
            textTransform: "uppercase",
          }}
        >
          {STATUS_LABELS[product.status]}
        </span>
        <span style={{ fontSize: 9, color: "#cbd5e1" }}>·</span>
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
            letterSpacing: 1,
            color: product.accent,
            textTransform: "uppercase",
          }}
        >
          {product.format}
        </span>
      </div>

      <h3
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 17,
          color: "#0a2540",
          margin: "0 0 6px",
          lineHeight: 1.3,
        }}
      >
        {product.name}
      </h3>

      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: "#0a2540",
          marginBottom: 2,
        }}
      >
        {product.price}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#697386",
          marginBottom: 14,
        }}
      >
        {[product.priceNote, product.turnaround].filter(Boolean).join(" · ")}
      </div>

      <p
        style={{
          fontSize: 12.5,
          color: "#425466",
          lineHeight: 1.6,
          margin: "0 0 16px",
          flex: 1,
        }}
      >
        {product.description}
      </p>

      {product.features && product.features.length > 0 && (
        <ul style={{ margin: "0 0 18px", padding: 0, listStyle: "none" }}>
          {product.features.slice(0, 3).map((f) => (
            <li
              key={f}
              style={{
                fontSize: 11.5,
                color: "#0a2540",
                marginBottom: 6,
                paddingLeft: 14,
                position: "relative",
                lineHeight: 1.5,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 6,
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: product.accent,
                }}
              />
              {f}
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <Link
          href={ctaHref}
          style={{
            flex: 1,
            display: "block",
            textAlign: "center",
            padding: "10px 0",
            background: product.accent,
            color: "#ffffff",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            fontSize: 12,
            borderRadius: 6,
            textDecoration: "none",
            letterSpacing: 0.3,
          }}
        >
          {isLive && product.sampleRoute ? "View Sample" : product.cta}
        </Link>
        {isLive && product.sampleRoute && (
          <Link
            href={`/contact?product=${product.id}&ref=pricing`}
            style={{
              padding: "10px 14px",
              border: `1px solid ${product.accent}`,
              color: product.accent,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              borderRadius: 6,
              textDecoration: "none",
              letterSpacing: 0.3,
            }}
          >
            {product.cta}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  // Group products by container, drop empty containers
  const groups = CONTAINER_ORDER
    .map((container: ProductContainer) => ({
      container,
      label: CONTAINER_LABELS[container],
      products: PRODUCTS.filter((p) => p.container === container),
    }))
    .filter((g) => g.products.length > 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "'Inter', sans-serif",
        color: "#0a2540",
      }}
    >
      <SiteNav theme="light" />

      {/* Header */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(48px, 6vw, 80px) 20px 0", textAlign: "center" }}>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 2,
            color: "#5B8DB8",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Products & Pricing
        </div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 4vw, 40px)",
            margin: "0 0 16px",
            lineHeight: 1.2,
          }}
        >
          Intelligence built for the decision you&rsquo;re actually making.
        </h1>
        <p style={{ color: "#425466", fontSize: 15, margin: "0 auto 28px", lineHeight: 1.7, maxWidth: 620 }}>
          Every product below pulls from the same primary-source intelligence pipeline. What changes is the
          deliverable — framed for insurance underwriters, developers, operators, cities, investors, and federal buyers.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/contact?ref=pricing"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#5B8DB8",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.04em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Talk to Us
          </Link>
          <Link
            href="#products"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              border: "1px solid #5B8DB8",
              color: "#5B8DB8",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.04em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Browse the Catalog ↓
          </Link>
        </div>
      </section>

      {/* Container quick-nav */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 20px 0" }} id="products">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          {groups.map((g) => (
            <a
              key={g.container}
              href={`#container-${g.container}`}
              style={{
                fontSize: 11,
                color: "#425466",
                background: "#f9fbfd",
                border: "1px solid #e3e8ee",
                borderRadius: 999,
                padding: "6px 14px",
                textDecoration: "none",
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              {g.label} · {g.products.length}
            </a>
          ))}
        </div>
      </section>

      {/* Product grid by container */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 64px" }}>
        {groups.map((g) => (
          <div key={g.container} id={`container-${g.container}`} style={{ marginBottom: 56, scrollMarginTop: 80 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 20,
                paddingBottom: 12,
                borderBottom: "1px solid #e3e8ee",
              }}
            >
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 22,
                  color: "#0a2540",
                  margin: 0,
                }}
              >
                {g.label}
              </h2>
              <span style={{ fontSize: 12, color: "#8792a2", fontFamily: "'Space Mono', monospace" }}>
                {g.products.length} {g.products.length === 1 ? "product" : "products"}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
                gap: 18,
              }}
            >
              {g.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #e3e8ee 20%, #e3e8ee 80%, transparent)", marginBottom: 48 }} />
        <h3
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 20,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          Questions
        </h3>
        {FAQS.map((faq) => (
          <div
            key={faq.q}
            style={{
              borderBottom: "1px solid #e3e8ee",
              padding: "20px 0",
            }}
          >
            <div style={{ color: "#0a2540", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {faq.q}
            </div>
            <div style={{ color: "#697386", fontSize: 12, lineHeight: 1.7 }}>
              {faq.a}
            </div>
          </div>
        ))}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <Link
            href="/contact?ref=pricing"
            style={{
              display: "inline-block",
              padding: "12px 32px",
              background: "#5B8DB8",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            Talk to Us
          </Link>
        </div>
      </section>

      <SiteFooter theme="light" />
    </div>
  );
}
