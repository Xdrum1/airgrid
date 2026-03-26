import Link from "next/link";
import { auth } from "@/auth";
import NavClient from "./NavClient";

export default async function SiteNav() {
  const session = await auth();
  const isAuthed = !!session?.user;

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        background: "rgba(5,5,8,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
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
          <img
            src="/images/logo/airindex-wordmark.svg"
            alt="AirIndex"
            style={{ height: 28 }}
          />
        </Link>
        <NavClient isAuthed={isAuthed} />
      </div>
    </nav>
  );
}
