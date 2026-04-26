/**
 * Admin tool for minting client share links to any of the supported
 * report types. Fronts /api/admin/share. Admin-gated.
 */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import ShareForm from "./ShareForm";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "alan@airindex.io";

export const metadata = {
  title: "Share Link Generator — AirIndex Admin",
  robots: "noindex, nofollow",
};

export default async function AdminSharePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/share");
  if (session.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) redirect("/dashboard");

  return (
    <div style={{ minHeight: "100vh", background: "#f9fbfd", color: "#0a2540", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Link href="/admin" style={{ color: "#5B8DB8", fontSize: 12, textDecoration: "none" }}>
            ← Admin
          </Link>
          <div style={{ fontSize: 11, color: "#697386", fontFamily: "'Space Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
            Internal Tool
          </div>
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
          Share Link Generator
        </h1>
        <p style={{ color: "#697386", fontSize: 13, lineHeight: 1.7, marginBottom: 32 }}>
          Mint a tokenized URL that lets a client view a single report without logging in. Token is signed,
          time-bound (default 30 days), and only unlocks the exact params it was issued for.
        </p>

        <ShareForm />
      </div>
    </div>
  );
}
