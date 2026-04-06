import type { Metadata } from "next";
import Script from "next/script";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.airindex.io"),
  title: "AirIndex — UAM Market Intelligence",
  description: "The institutional intelligence layer for the AAM ecosystem. Market readiness data for operators, infrastructure developers, aerospace, and government organizations shaping where eVTOL operates.",
  keywords: ["urban air mobility", "eVTOL", "vertiport", "air taxi", "UAM", "Joby", "Archer"],
  manifest: "/manifest.json",
  icons: {
    icon: "/images/logo/airindex-favicon.svg",
    apple: "/images/logo/airindex-logo-300.png",
  },
  openGraph: {
    title: "AirIndex — UAM Market Intelligence",
    description: "The intelligence infrastructure for urban air mobility. Market readiness data across 20+ U.S. markets, updated continuously from primary sources.",
    siteName: "AirIndex",
    url: "https://www.airindex.io",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@AirIndexHQ",
    title: "AirIndex — UAM Market Intelligence",
    description: "The intelligence infrastructure for urban air mobility. Market readiness data across 20+ U.S. markets, updated continuously from primary sources.",
    images: ["/images/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#050508" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Plausible Analytics (cookieless, GDPR-compliant) */}
        <Script
          src="https://plausible.io/js/pa-d8Fqfg9wRL9bqO620StZS.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`}
        </Script>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
