# AIRINDEX — UAM Market Intelligence Platform
> The intelligence layer for the Urban Air Mobility industry.

## What This Is
AirIndex tracks vertiports, operators, regulatory filings, and market readiness 
scores across US Urban Air Mobility markets. This is the MVP — a curated data 
product built to establish a defensible position in the UAM data layer before 
the industry scales.

## Quick Start (VS Code)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Edit .env.local with your keys (Mapbox is free tier for MVP)

# 3. Run dev server
npm run dev

# 4. Open browser
# http://localhost:3000
```

## Project Structure
```
src/
├── app/              # Next.js app router
│   ├── layout.tsx    # Root layout, fonts
│   ├── page.tsx      # Entry point
│   └── globals.css   # Global styles
├── components/
│   └── Dashboard.tsx # Main dashboard UI
├── data/
│   └── seed.ts       # Cities + operators seed data (edit here)
├── lib/
│   ├── scoring.ts    # UAM Readiness Score calculator
│   └── faa-api.ts    # FAA / Federal Register / SEC integrations
└── types/
    └── index.ts      # All TypeScript types
```

## The UAM Readiness Score
Each market is scored 0–100 based on:

| Factor                  | Weight |
|-------------------------|--------|
| Active pilot program    | 20     |
| Approved vertiport      | 20     |
| Active operators        | 15     |
| Vertiport zoning exists | 15     |
| Regulatory posture      | 10     |
| State-level legislation | 10     |
| FAA LAANC coverage      | 10     |

## Data Sources (Live APIs to Wire Up)
- **FAA LAANC/UASFM**: https://uas-faa.opendata.arcgis.com (public, no key)
- **Federal Register**: https://www.federalregister.gov/api/v1 (public, no key)
- **LegiScan**: https://legiscan.com/legiscan (free API key)
- **SEC EDGAR**: https://data.sec.gov/api (public, no key)

## Roadmap
- [ ] v0.1 — MVP dashboard (current)
- [ ] v0.2 — Wire FAA + Federal Register APIs for live data
- [ ] v0.3 — Email alert subscriptions ("notify me when...")
- [ ] v0.4 — Vertiport database (individual records, not just counts)
- [ ] v0.5 — Regulatory filings tracker
- [ ] v1.0 — Paid tier + embeddable widget

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + inline styles
- **Fonts**: Space Mono + Syne (Google Fonts)
- **Deployment**: Vercel (free tier)
