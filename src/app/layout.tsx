import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.airindex.io"),
  title: "AirIndex — UAM Market Readiness Ratings",
  description: "Know exactly where urban air mobility launches first. AirIndex scores 21 US cities on UAM market readiness in real time — regulatory posture, infrastructure, operator presence, and corridor authorizations.",
  keywords: ["urban air mobility", "eVTOL", "vertiport", "air taxi", "UAM", "Joby", "Archer"],
  manifest: "/manifest.json",
  icons: {
    icon: "/images/logo/airindex-favicon.svg",
    apple: "/images/logo/airindex-logo-300.png",
  },
  openGraph: {
    title: "AirIndex — UAM Market Readiness Ratings",
    description: "Know exactly where urban air mobility launches first. AirIndex scores 21 US cities on UAM market readiness in real time.",
    siteName: "AirIndex",
    url: "https://www.airindex.io",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@AirIndexHQ",
    title: "AirIndex — UAM Market Readiness Ratings",
    description: "Know exactly where urban air mobility launches first. AirIndex scores 21 US cities on UAM market readiness in real time.",
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
        <script async src="https://plausible.io/js/pa-d8Fqfg9wRL9bqO620StZS.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`,
          }}
        />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
