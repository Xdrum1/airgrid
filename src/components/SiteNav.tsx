import Link from "next/link";
import { auth } from "@/auth";
import NavClient from "./NavClient";

export default async function SiteNav({ theme = "dark" }: { theme?: "dark" | "light" } = {}) {
  const session = await auth();
  const isAuthed = !!session?.user;

  const isLight = theme === "light";

  return (
    <>
      <nav
        className={isLight ? "nav-light" : "nav-dark"}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: isLight ? "rgba(255,255,255,0.92)" : "rgba(5,5,8,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: isLight
            ? "1px solid rgba(10,37,64,0.08)"
            : "1px solid rgba(255,255,255,0.06)",
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
            <img
              src={isLight ? "/images/logo/airindex-wordmark-light.svg" : "/images/logo/airindex-wordmark.svg"}
              alt="AirIndex"
              style={{ height: 28 }}
            />
          </Link>
          <NavClient isAuthed={isAuthed} theme={theme} />
        </div>
      </nav>
      {/* Spacer to offset fixed nav height */}
      <div style={{ height: 64 }} />
    </>
  );
}
