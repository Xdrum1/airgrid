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
Each market is scored 0–100 based on (methodology v1.3):

| Factor                        | Code | Weight |
|-------------------------------|------|--------|
| State-level legislation       | LEG  | 20     |
| Active operator presence      | OPR  | 15     |
| Approved vertiport            | VRT  | 15     |
| Active pilot program          | PLT  | 15     |
| Vertiport zoning              | ZON  | 15     |
| Regulatory posture            | REG  | 10     |
| Weather intelligence coverage | WTH  | 10     |

## Data Sources (Live APIs)
- **Federal Register**: https://www.federalregister.gov/api/v1 (public, no key)
- **LegiScan**: https://legiscan.com/legiscan (free API key)
- **SEC EDGAR**: https://data.sec.gov/api (public, no key)
- **Congress.gov**: https://api.congress.gov/v3 (free API key)
- **Regulations.gov**: https://api.regulations.gov/v4 (free API key)
- **FAA NASR 5010**: heliport registry (bulk download)

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
