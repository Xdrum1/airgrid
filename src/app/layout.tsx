import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AirIndex — UAM Market Intelligence",
  description: "The intelligence layer for the Urban Air Mobility industry. Track vertiports, operators, regulatory filings, and market readiness scores across the US.",
  keywords: ["urban air mobility", "eVTOL", "vertiport", "air taxi", "UAM", "Joby", "Archer"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
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
