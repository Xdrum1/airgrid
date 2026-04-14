# AirIndex Platform Context

Maintained by dev. Update after every significant deploy or data change. Share with Claude at the start of each session.

## Platform Status

- **Last updated:** 2026-04-14
- **Scoring model version:** v1.3 live in production. v1.4 scaffolded in `src/lib/scoring-v14.ts` — feature-flagged, not wired into the main scoring engine. Awaiting TruWeather deployment data + Don Berchoff sign-off.
- **Markets tracked:** 25
- **Candidate sites indexed:** No dedicated `candidate-sites` data file yet. 5,647 FAA-registered heliports (NASR 5010) + 6 pre-development facilities in DB.
- **Environment:** Production on AWS Amplify + RDS PostgreSQL. Local dev DB at `localhost:5432/airindex_dev` (requires separate `prisma db push` on schema changes).

## Scoring Model — Current Weights (v1.3)

| Factor                   | Points | Type       |
|--------------------------|--------|------------|
| State Legislation        | 20     | Graduated  |
| Active Pilot Program     | 15     | Binary     |
| Approved Vertiport       | 15     | Binary     |
| Active Operator Presence | 15     | Binary     |
| Vertiport Zoning         | 15     | Binary     |
| Regulatory Posture       | 10     | Graduated  |
| Weather Infrastructure   | 10     | Graduated (full/partial/none) |

**Readiness tiers:**
- ADVANCED: 75–100
- MODERATE: 50–74
- EARLY: 30–49
- NASCENT: 0–29

**LAANC (LNC) retired in v1.3** — every tracked US market has coverage, factor didn't discriminate. Replaced by Weather Infrastructure.

## Scoring Model — v1.4 (Pending Activation)

Developed with Don Berchoff (TruWeather). Splits Weather Infrastructure into two 5-pt sub-indicators:

- **ASOS Proximity (5 pts):** Full (5/5) ≤5nm | Partial (2/5) 5–10nm | None (0/5) >10nm. Per FAA NPRM Part 108 5nm rule.
- **Low-Altitude Sensing (5 pts):** Full (5/5) wind LIDAR deployed | None (0/5) not deployed. Sourced from `TruWeatherDeployment` table.
- **Altitude range:** 30ft–2,000ft AGL.
- **Rollup:** averages per-site credit across heliports, airports, and pre-development facilities within the metro grid.

**Activation blockers:**
1. `TruWeatherDeployment` table exists in schema but has 0 rows — ingestion script (`scripts/ingest-truweather-deployment.ts`) needs TruWeather's Phase 2 deployment map.
2. Validation pass comparing v1.4 output vs v1.3 live scores.
3. Don's sign-off on methodology doc.
4. Feature flag flip + snapshot regeneration + subscriber alerts for markets that change.

## Current Market Scores (v1.3 live, 2026-04-14)

| Market             | Score | Tier     |
|--------------------|-------|----------|
| Los Angeles, CA    | 95    | ADVANCED |
| Dallas, TX         | 95    | ADVANCED |
| Miami, FL          | 80    | ADVANCED |
| Orlando, FL        | 80    | ADVANCED |
| San Francisco, CA  | 75    | ADVANCED |
| New York, NY       | 55    | MODERATE |
| Houston, TX        | 50    | MODERATE |
| Austin, TX         | 50    | MODERATE |
| San Diego, CA      | 50    | MODERATE |
| Tampa, FL          | 45    | EARLY    |
| San Antonio, TX    | 45    | EARLY    |
| Phoenix, AZ        | 40    | EARLY    |
| Cincinnati, OH     | 40    | EARLY    |
| Chicago, IL        | 35    | EARLY    |
| Salt Lake City, UT | 35    | EARLY    |
| Las Vegas, NV      | 25    | NASCENT  |
| Charlotte, NC      | 25    | NASCENT  |
| Columbus, OH       | 25    | NASCENT  |
| Atlanta, GA        | 10    | NASCENT  |
| Nashville, TN      | 10    | NASCENT  |
| Denver, CO         | 10    | NASCENT  |
| Seattle, WA        | 10    | NASCENT  |
| Boston, MA         | 10    | NASCENT  |
| Minneapolis, MN    | 10    | NASCENT  |
| Washington D.C.    | 0     | NASCENT  |

## Feature Flags

| Flag          | Status | Description                                                          |
|---------------|--------|----------------------------------------------------------------------|
| scoring-v14   | off    | Splits Weather Infrastructure into ASOS + Low-Alt Sensing sub-indicators. Scaffold exists (`src/lib/scoring-v14.ts`); not wired to main engine. |

## Recent Deploys / Changelog

| Date       | Change                                                                       | Type                   |
|------------|------------------------------------------------------------------------------|------------------------|
| 2026-04-14 | Causal narrative panel (why this score, what to watch) on city detail        | New feature            |
| 2026-04-14 | RPL significance tightened — HIGH now gated on UAM-specific terms; 5.4% HIGH vs 18% before | Data quality           |
| 2026-04-14 | LAANC removed across code + prospect-facing docs; dead `checkLaancCoverage` code deleted | Methodology / cleanup  |
| 2026-04-14 | RPL regulatory precedents panel on city detail (Pro-gated)                   | New feature            |
| 2026-04-14 | Classifier city-IDs hard-constrained at write time; per-source silence thresholds in audit | Data quality           |
| 2026-04-14 | Congress.gov + Regulations.gov ingestion fixed (silent since launch)         | Bug fix                |
| 2026-04-14 | RPL scoped to regulatory sources only — removed 1,716 polluted docs (operator_news, sec_edgar) | Data quality           |
| 2026-04-14 | Prediction ledger auto-advances via snapshot cron; facility-milestone verification enabled | New feature            |
| 2026-04-10 | Predictive pipeline end-to-end fixes — Phoenix actually moved 50→40          | Bug fix + methodology  |
| 2026-03-27 | Operator detail pages + gap analysis engine with sub-indicators              | New feature            |

## Active Data Partnerships

- **TruWeather Solutions** — NDA executed April 14, 2026. Integration: low-altitude sensing sub-indicator (v1.4). Phase 2 deployment map pending. Contact: Don Berchoff (CEO).
- **HeliExperts International / Rex Alexander** — Design partner, complimentary Pro access. VFS Infrastructure Advisor. Working with FAA Tech Center + Rowan University on AI heliport verification. Joint product opportunity (risk framework + AI audit + AirIndex platform).

## Pending / In Progress

- [ ] v1.4 scoring live — pending TruWeather deployment map ingestion + Don's sign-off
- [ ] TruWeather `TruWeatherDeployment` table populated (currently 0 rows; schema ready)
- [ ] MCS container (peer market context, Container 2 of V2 architecture) — scaffolded in schema, no read/write code
- [ ] Tomorrow morning 2026-04-15 verification: snapshot cron populated predictions; Congress.gov + Regulations.gov finally have `IngestedRecord` rows
- [ ] RPL surface enhancement — factor-scoped grouping (currently just limit-based; subscriber doesn't see "these 3 precedents drive your LEG score" explicitly)
- [ ] sec_edgar was last ingested 2026-03-20; API is healthy locally, worth monitoring for a couple more cron runs before investigating AWS-side

## Key File References

- **Scoring logic (v1.3):** `src/lib/scoring.ts` — `calculateReadinessScoreFromFkb()` is the production path
- **Scoring logic (v1.4 scaffold):** `src/lib/scoring-v14.ts` — feature-flagged, not wired
- **Market seed data:** `src/data/seed.ts`
- **Pre-development facilities:** `src/data/pre-development-facilities.ts`
- **TruWeather schema:** `prisma/schema.prisma` → `TruWeatherDeployment` model (empty)
- **Ingestion:** `src/lib/ingestion.ts` (orchestrator), `src/lib/classifier.ts` (Haiku classification)
- **Forward signals:** `src/lib/forward-signals.ts` — `getForwardSignals(cityId)`, `logAllPredictions(ctx)`
- **Causal narrative:** `src/lib/causal-narrative.ts` — `getCausalNarrative(city)`
- **RPL precedents:** `src/lib/rpl-precedents.ts` — `getPrecedentsForCity(cityId, limit)`
- **Predictive audit:** `scripts/audit-predictive-pipeline.ts`
- **Pulse pre-flight:** `scripts/pulse-preflight.ts`

## Editing the VDG Site (verticaldatagroup.com)

The VDG site has a **two-repo setup** and a sync script:

- **Source of truth:** `public/vdg/index.html` in this repo (airgrid)
- **Production deploy target:** `~/projects/vdg/` → `github.com/Xdrum1/vdg` → Amplify app `dcbgrkvvzyjfg` → `verticaldatagroup.com`
- **Sync script:** `scripts/sync-vdg.sh` — copies the mirror to the production repo, commits, and pushes

**Correct workflow when "updating VDG":**
1. Edit `public/vdg/index.html` here
2. Run `./scripts/sync-vdg.sh` (optionally with a commit message)
3. Amplify auto-redeploys in 2–3 minutes

Do NOT edit `~/projects/vdg/index.html` directly — it will get overwritten on the next sync and create divergence.

## V2 Architecture Containers

| Container | Status | Notes |
|-----------|--------|-------|
| FKB (Factor Knowledge Base)          | Live    | 7 active factors, 1 retired (LNC). Production scoring reads from here. |
| MCS (Market Context Store)           | Schema only | No read/write code yet; next container to build for Gap Analysis precedents. |
| OID (Operator Intelligence Database) | Live    | 6-stage deployment model; 11 operators. |
| RPL (Regulatory Precedent Library)   | Live + surfaced | 496 clean docs (HIGH 27 / MED 131 / LOW 338). Pro-gated precedents panel on city detail (shipped 2026-04-14). |
| FPIS (Federal Programs Intelligence) | Live    | 10 programs cataloged. Dual-consumer: Gap Analysis + VDG Grant Tracker. |
