# AirIndex Technical Architecture

> Last updated: 2026-03-07
> For: Engineering onboarding, system audit, and operational reference

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Data Model](#data-model)
4. [Scoring Engine](#scoring-engine)
5. [Automated Pipelines (Crons)](#automated-pipelines)
6. [NLP Classifier](#nlp-classifier)
7. [Rules Engine (Fallback)](#rules-engine)
8. [Score Override System](#score-override-system)
9. [Authentication & Sessions](#authentication--sessions)
10. [Admin Panel](#admin-panel)
11. [Public API v1](#public-api-v1)
12. [Billing & Tiers](#billing--tiers)
13. [Email System](#email-system)
14. [Security](#security)
15. [Infrastructure & Deployment](#infrastructure--deployment)
16. [Monitoring & Alerting](#monitoring--alerting)
17. [Environment Variables](#environment-variables)
18. [Key Files Reference](#key-files-reference)
19. [What's Automated vs Manual](#whats-automated-vs-manual)
20. [Known Gaps & TODOs](#known-gaps--todos)

---

## System Overview

AirIndex is a UAM (Urban Air Mobility) market intelligence platform that scores U.S. cities on their readiness for eVTOL/drone operations. Think "S&P 500 for UAM markets."

**Core loop:**
1. Ingest public data from 4 sources (FAA, state legislatures, SEC, news)
2. Classify relevance using Claude Haiku + regex fallback
3. Generate scoring override candidates with confidence levels
4. Auto-apply high-confidence overrides; queue others for admin review
5. Snapshot scores daily for historical tracking
6. Surface everything through a dashboard, admin panel, and API

**Current scale:** 20+ US markets (see `MARKET_COUNT`), 5 operators, 9 vertiports, 9 corridors

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL (AWS RDS) |
| ORM | Prisma |
| Auth | NextAuth.js (JWT sessions, email magic link) |
| Payments | Stripe (Checkout + Customer Portal) |
| Email | AWS SES (direct SigV4, no SDK) |
| Rate Limiting | Upstash Redis (in-memory fallback) |
| Error Tracking | Sentry (@sentry/nextjs, tunnel route) |
| Analytics | Plausible (cookieless, GDPR-compliant) |
| AI/NLP | Anthropic Claude Haiku 4.5 |
| Maps | Mapbox GL JS |
| Hosting | AWS Amplify |
| CI/CD | GitHub Actions (cron scheduling) |
| Package Manager | npm |
| Testing | Vitest + v8 coverage |

---

## Data Model

### Database Schema (PostgreSQL via Prisma)

```
prisma/schema.prisma
```

**Auth models** (NextAuth required):
- `User` -- core identity, `tier` field (free|pro|institutional|enterprise|grandfathered)
- `Account` -- OAuth provider records
- `Session` -- JWT session tokens
- `VerificationToken` -- magic link tokens (10-min expiry)

**Scoring & intelligence:**
- `ScoreSnapshot` -- historical score + breakdown JSON + tier, indexed by (cityId, capturedAt)
- `ScoringOverride` -- factor overrides with confidence (high|medium|needs_review), applied/superseded timestamps
- `ClassificationResult` -- NLP output audit trail (event type, factors, confidence, raw response, model version)
- `ChangelogEntry` -- event log (score changes, legislation, filings), indexed by timestamp
- `AutoReviewResult` -- AI review decisions (approve|reject|skip, confidence, reasoning)

**Corridors:**
- `Corridor` -- DB-backed entities (status, start/end points, waypoints, FAA auth, cleared operators)
- `CorridorStatusHistory` -- audit trail for status transitions

**User engagement:**
- `UserEvent` -- page views, clicks, tab switches (indexed by userId, entity type/id)
- `Subscription` -- user alert preferences (cities, corridors, change types)
- `Watchlist` -- city favorites per user
- `ContactInquiry` -- contact form submissions

**Billing:**
- `BillingSubscription` -- Stripe subscription state (tier, status, period dates, cancellation)
- `ApiKey` -- bearer tokens (SHA-256 hashed, `aix_` prefix, lastUsedAt tracking)

**Market intelligence:**
- `MarketLead` -- pre-scoring market candidates (city, state, source, signal, status lifecycle, factor snapshot)
- `AccessRequest` -- invite-only access request queue

### Static Seed Data

```
src/data/seed.ts
```

All cities, operators, vertiports, and corridors are defined as static arrays. Key exports:
- `CITIES` -- all tracked markets with scores pre-calculated via `calculateReadinessScore()`
- `OPERATORS` -- 5 eVTOL companies
- `VERTIPORTS` -- 9 infrastructure sites
- `CORRIDORS` -- 9 flight corridors (seed fallback for DB)
- `STATE_TO_CITIES` -- derived map (state abbreviation -> city IDs)
- `MARKET_COUNT` -- `CITIES.length` (used for dynamic references)

**Seed + DB merge pattern:** `getCitiesWithOverrides()` fetches active high-confidence overrides from DB and merges them onto static seed data. 60-second cache. This lets the scoring pipeline update scores without redeploying.

---

## Scoring Engine

```
src/lib/scoring.ts
```

### 7-Factor Model — v1.3 weights (0-100 scale)

| Factor | Code | Weight | Type | What It Measures |
|--------|------|--------|------|-----------------|
| `stateLegislationStatus` | LEG | 20 | enum | Graduated: `signed` = 20, `actively_moving` = 10, `introduced` = 5, `none` = 0 |
| `activeOperatorPresence` | OPR | 15 | boolean | `activeOperators.length > 0` |
| `approvedVertiport` | VRT | 15 | boolean | `vertiportCount > 0` triggers this |
| `hasActivePilotProgram` | PLT | 15 | boolean | Operational eVTOL testing in city |
| `hasVertiportZoning` | ZON | 15 | boolean | Local zoning code allows vertiport construction |
| `regulatoryPosture` | REG | 10 | enum | `friendly` = 10, `neutral` = 5, `restrictive` = 0 |
| `weatherInfraLevel` | WTH | 10 | enum | Graduated: `full` = 10, `partial` = 5, `none` = 0 |

LAANC coverage (LNC) was retired in v1.3 because every tracked US market already has LAANC coverage — the factor didn't discriminate.

### Score Tiers

| Tier | Range | Color |
|------|-------|-------|
| ADVANCED | 75-100 | `#00ff88` (green) |
| MODERATE | 50-74 | `#00d4ff` (cyan) |
| EARLY | 30-49 | `#f59e0b` (amber) |
| NASCENT | 0-29 | `#ff4444` (red) |

### Calculation Flow

```
Static seed data (RAW_CITIES)
  -> getCitiesWithOverrides() merges DB overrides (high-confidence only)
  -> calculateReadinessScore(city) returns { score, breakdown }
  -> getScoreTier(score) returns tier label
  -> CITIES array sorted by score DESC, cached 60s
```

---

## Automated Pipelines

All crons are triggered by **GitHub Actions** calling authenticated API endpoints. The app runs on AWS Amplify (NOT Vercel), so `vercel.json` crons are unused.

### Schedule Overview

| Time (UTC) | Day | Pipeline | Endpoint | What It Does |
|------------|-----|----------|----------|-------------|
| 06:00 | Daily | **Snapshot** | `GET /api/snapshot` | Captures current score for all tracked markets |
| 06:00 | Daily | **Ingestion** | `POST /api/ingest` | Fetches 4 data sources, classifies, generates overrides |
| 07:00 | Monday | **Digest** | `GET /api/digest` | Sends weekly email summaries to subscribers |
| 08:00 | Monday | **Auto-Review** | `GET /api/admin/overrides/auto-review` | AI reviews pending overrides, auto-promotes high-confidence |

### Cron Authorization

All cron endpoints require `Authorization: Bearer <CRON_SECRET>`.
Validated in `src/lib/admin-helpers.ts` via `authorizeCron(request)` using `crypto.timingSafeEqual`.
Returns 401 if missing/invalid. Rate limited at route level.

GitHub Actions workflows are in `.github/workflows/`:
- `snapshot-cron.yml`
- `ingest-cron.yml`
- `digest-cron.yml`
- `auto-review-cron.yml`

Each workflow: checks `/api/health` first, then calls the cron endpoint with Bearer token.

### Pipeline 1: Snapshot (Daily 06:00 UTC)

```
src/app/api/snapshot/route.ts
```

1. Authorize cron request
2. Rate limit: 2 calls/hour
3. `getCitiesWithOverrides()` -- get all tracked markets with applied overrides
4. For each city: create `ScoreSnapshot` record (score, breakdown JSON, tier, timestamp)
5. On failure: `alertCronFailure("snapshot", err)` sends admin email

**Writes to:** `ScoreSnapshot` table

### Pipeline 2: Ingestion (Daily 06:00 UTC)

```
src/app/api/ingest/route.ts -> src/lib/ingestion.ts
```

This is the big one. Runs in background via `after()` to avoid HTTP timeout.

**Step 1 -- Fetch** (4 sources in parallel):

| Source | API | Query | Lookback |
|--------|-----|-------|---------|
| Federal Register | `federalregister.gov/api/v1` | "eVTOL", "vertiport", "powered-lift", "eIPP", "integration pilot program", "urban air mobility" | 90 days |
| LegiScan | `api.legiscan.com` | "drone OR UAM OR eVTOL OR vertiport OR urban air mobility" | All 50 states + DC, batched 10 at a time |
| SEC EDGAR | `data.sec.gov/api` | 8-K, 10-K, 10-Q for Joby, Archer, Blade (by CIK) | 10 recent per form type |
| Operator News | `news.google.com/rss` | Joby, Archer, Wisk, Blade, Volocopter + industry "eVTOL" feed | 30 days |

**Step 2 -- Normalize** all records to `IngestedRecord` format (id, source, title, summary, date, url, state)

**Step 3 -- Enrich** sparse summaries:
- SEC 8-K: fetch full text, extract "Item" sections (6000 char cap)
- News: fetch article body (1500 char cap)
- Batched 5 at a time, 8s timeout per fetch

**Step 4 -- Diff** against `/data/ingested.json` (tracks what we've already processed)
- New records: fully process
- Updated records: re-process
- Unchanged: skip

**Step 5 -- Classify** (two paths run in parallel):
- **Primary:** Claude Haiku NLP classifier (`classifyRecords()`)
- **Fallback:** Regex rules engine (`evaluateRulesV2()`)
- If NLP fails, rules engine results are used instead

**Step 6 -- Apply overrides** via `applyOverrides()`:
- Persist candidates to `ScoringOverride` table
- High-confidence: auto-apply immediately, recalculate scores, create snapshots
- Medium/needs_review: queue for admin

**Step 7 -- Process corridor events** (if any):
- Match corridor names from filing text
- Update corridor status, log to `CorridorStatusHistory`

**Step 8 -- Create changelog entries** for all new/updated records

**Step 9 -- Notify subscribers** (background, non-blocking)

**Writes to:** `ScoringOverride`, `ChangelogEntry`, `ScoreSnapshot`, `CorridorStatusHistory`, `/data/ingested.json`

**On failure:** `alertCronFailure("ingest", err)` sends admin email

### Pipeline 3: Digest (Weekly Monday 07:00 UTC)

```
src/app/api/digest/route.ts -> src/lib/notifications.ts::sendWeeklyDigests()
```

1. Fetch all `ChangelogEntry` records from past 7 days
2. For each subscriber: filter entries by their subscription preferences (city IDs, change types, corridor IDs)
3. If matches found: send digest email via SES with entry table, source links, unsubscribe link

**Writes to:** Emails via SES

### Pipeline 4: Auto-Review (Weekly Monday 08:00 UTC)

```
src/app/api/admin/overrides/auto-review/route.ts -> src/lib/auto-reviewer.ts
```

Two sub-flows depending on override type:

**Flow A -- Standard overrides** (medium/needs_review):
1. Optionally fetch source document (5-10s timeout)
2. Claude reviews: approve/reject/skip with confidence 0-1
3. Auto-apply if: approve >= 0.85 confidence, reject >= 0.90 confidence
4. Otherwise: skip (stays in admin queue)

**Flow B -- `__review__` overrides** (recommendation placeholders):
1. Fetch source document
2. Claude recommends specific factor changes (field, value, confidence)
3. Apply recommendations as sub-overrides
4. Auto-promote if confidence >= 0.92 (max 3 per run)
5. Recalculate scores for promoted cities

**Writes to:** `AutoReviewResult`, `ScoringOverride`, `ChangelogEntry`, `ScoreSnapshot`

**Config options:**
```typescript
{ maxOverrides: 20, dryRun: false, fetchSource: true }
```

---

## NLP Classifier

```
src/lib/classifier.ts
```

**Model:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
**Batch size:** 10 records per API call
**Called by:** Ingestion pipeline (Step 5)

### System Prompt (Dynamic)

The system prompt is generated from live seed data:
- City table built from `CITIES` array (id, name, state)
- Operator table built from `OPERATORS` array (id, name)
- 7 scoring factors with descriptions
- 8 event types: `state_legislation_signed`, `vertiport_zoning_approved`, `faa_corridor_filing`, `operator_expansion`, `pilot_program_launched`, `infrastructure_approved`, `regulatory_change`, `not_relevant`

### Output Per Record

```json
{
  "recordId": "federal_register_FR2023...",
  "eventType": "state_legislation_signed",
  "factorsAffected": [{ "field": "hasStateLegislation", "value": true, "reason": "..." }],
  "affectedCityIds": ["columbus"],
  "confidence": "high",
  "summary": "Ohio HB 251 signed into law..."
}
```

### Confidence Rules

- **high:** Completed action + specific cities mapped
- **medium:** Implied impact OR state-level only
- **needs_review:** Unclear impact, federal filing with multiple markets, or unresolved city

### Mapping to Override Candidates

- Skip `not_relevant` records
- Resolve unresolved cities via `STATE_TO_CITIES` mapping from seed.ts
- Create one `OverrideCandidate` per city per affected factor
- Confidence downgraded to `needs_review` if city had to be resolved from state

### Audit Trail

Every classification saved to `ClassificationResult` table with:
- Full raw JSON response
- Model name + prompt version
- Event type, factors, cities, confidence

---

## Rules Engine

```
src/lib/rules-engine.ts
```

Regex-based fallback that runs in parallel with NLP. Used when NLP API fails.

| Rule | Trigger Pattern | Override Generated |
|------|----------------|-------------------|
| State legislation | LegiScan + signed status + UAM keywords | `hasStateLegislation=true` (high) for all state cities |
| Vertiport zoning | LegiScan + signed + zoning keywords | `hasVertiportZoning=true` (medium) for all state cities |
| FAA filings | Federal Register + corridor/cert keywords | `regulatoryPosture=friendly` (needs_review) to `__unresolved__` |
| SEC cert milestone | SEC + FAA cert keywords | `hasActivePilotProgram=true` (medium) for operator's markets |
| Operator expansion | SEC + expansion keywords | `activeOperatorPresence=true` (medium/needs_review) |
| Infrastructure | Any source + infrastructure keywords | `approvedVertiport=true` (needs_review) to `__unresolved__` |

Also detects corridor events by matching corridor name patterns from seed data.

---

## Score Override System

```
src/lib/score-updater.ts (persistence + auto-apply)
src/lib/admin.ts (manual approve/reject)
src/lib/auto-reviewer.ts (AI review)
```

### 3-Layer Confidence Model

| Level | Source | Behavior |
|-------|--------|----------|
| `high` | Rules engine (signed legislation) or admin approval | Auto-applied, immediately affects scores |
| `medium` | NLP classifier or rules engine | Queued for admin review, does NOT affect scores |
| `needs_review` | NLP classifier (ambiguous) | Queued for admin review, does NOT affect scores |

### Override Lifecycle

```
Ingestion -> Classifier/Rules -> OverrideCandidate
  |
  v
ScoringOverride record created
  |
  +-- confidence=high -> auto-applied (appliedAt=now)
  |     -> supersedes older overrides for same city+field
  |     -> recalculate score -> ScoreSnapshot + ChangelogEntry
  |
  +-- confidence=medium/needs_review -> sits in admin queue
        |
        +-- Admin approves -> appliedAt=now -> recalculate -> snapshot
        +-- Admin rejects -> supersededAt=now (soft delete)
        +-- AI auto-review approves (>= 0.85) -> same as admin approve
        +-- AI auto-review rejects (>= 0.90) -> same as admin reject
        +-- AI skips -> stays in queue
```

### Field Translation

When overrides are merged onto city data:
- `approvedVertiport: true` -> sets `vertiportCount = 1` (if currently 0)
- `activeOperatorPresence: true` -> adds `__override__` to `activeOperators[]`
- All other fields map directly (boolean or enum value)

---

## Authentication & Sessions

```
src/auth.ts
```

### Magic Link Flow

1. User enters email at `/login`
2. NextAuth sends magic link via SES (10-min expiry)
3. Rate limited: 3 sends per 15 minutes per email
4. Click link -> JWT session created (7-day max age)
5. JWT contains: id, email, name, tier

### Invite-Only Access

1. User submits `/request-access` form (email, role, context)
2. `AccessRequest` record created
3. Admin reviews in admin panel -> approve or reject
4. Approved -> invite email sent with one-click sign-in token
5. Token callback at `/api/auth/invite` creates session directly

### Session Data

JWT token populated in callbacks:
- `jwt` callback: fetches user tier from `getUserTier()` on sign-in
- `session` callback: exposes `session.user.id`, `.email`, `.name`, `.tier`

### Events

- `createUser`: sends welcome email + admin notification
- `signIn`: sends admin notification (skips admin's own logins)

---

## Admin Panel

```
src/app/admin/page.tsx -> src/components/AdminReview.tsx
```

### Admin Authentication

Two-step: email must match `ADMIN_NOTIFY_EMAIL` + correct `ADMIN_PIN`.

1. POST `/api/admin/auth` with `{ email, pin }`
2. Rate limited: 5 attempts per 15 minutes per IP
3. Success: signed cookie set (`admin-verified`, 1-hour expiry)
4. Cookie: `base64({email, ts}).HMAC-SHA256` -- verified on each admin API call
5. All admin routes call `requireAdmin(req)` which validates the cookie

### Admin Tabs

| Tab | Component | What It Shows |
|-----|-----------|--------------|
| Overrides | `AdminReview.tsx` | Pending scoring overrides, approve/reject/assign city |
| Classifications | `AdminClassifications.tsx` | NLP classification audit log |
| Corridors | `AdminCorridors.tsx` | Corridor CRUD (create, edit, delete) |
| Events | `AdminEvents.tsx` | User event audit log |
| Billing | `AdminBilling.tsx` | User tier management, Stripe subscription overview |
| Pipeline | `AdminPipelineHealth.tsx` | 4 pipeline status cards, changelog volume, pending reviews |
| Watchlist | `AdminLeads.tsx` | Market lead tracking (new -> researching -> verified -> added/dismissed) |
| Reports | (report generation) | Gap reports, methodology docs |

### Admin API Routes

| Route | Method | Purpose | Rate Limit |
|-------|--------|---------|-----------|
| `/api/admin/auth` | POST | PIN verification | 5/15min per IP |
| `/api/admin/overrides` | GET/POST | Override queue management | 30/5min GET, 10/5min POST |
| `/api/admin/overrides/auto-review` | GET/POST | AI review trigger (cron or manual) | 10/5min |
| `/api/admin/corridors` | POST | Create corridor | 10/5min |
| `/api/admin/corridors/[id]` | PUT/DELETE | Update/delete corridor | 10/5min |
| `/api/admin/billing` | GET/POST | View/assign user tiers | 30/60s GET, 10/60s POST |
| `/api/admin/classifications` | GET | Classification audit log | 10/5min |
| `/api/admin/events` | GET | User event log | 10/5min |
| `/api/admin/leads` | GET/POST/PATCH/DELETE | Market lead CRUD | 10/5min |
| `/api/admin/access-requests` | GET/POST | Access request approve/reject | 10/5min |

---

## Public API v1

```
src/app/api/v1/
src/lib/api/middleware.ts
src/lib/api/keys.ts
```

### Key Format

`aix_` + 40 hex characters (e.g., `aix_a1b2c3d4e5f6...`).
SHA-256 hashed in DB. Only shown once on creation. 8-char prefix stored for display.

### Auth Flow

1. Client sends `Authorization: Bearer aix_...`
2. `authenticateApiRequest()` extracts token
3. `validateApiKey()` hashes token, queries by hash, checks not revoked
4. Rate limit check (tier-based)
5. `touchApiKey()` updates `lastUsedAt` (fire-and-forget)
6. Returns `ApiContext` (userId, email, tier, keyId)

### Rate Limits

| Tier | Requests/Hour |
|------|--------------|
| Pro / Grandfathered | 100 |
| Institutional | 1,000 |
| Enterprise | 10,000 |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Endpoints

| Route | Method | Auth | Returns |
|-------|--------|------|---------|
| `/api/v1/markets` | GET | Bearer | All markets (summary) |
| `/api/v1/markets/[cityId]` | GET | Bearer | Single market detail + corridors |
| `/api/v1/markets/[cityId]/history` | GET | Bearer | Score history (all snapshots) |
| `/api/v1/markets/export` | GET | Bearer | All markets with full detail (bulk) |
| `/api/v1/keys` | GET | Session (Pro+) | User's active API keys |
| `/api/v1/keys` | POST | Session (Pro+) | Create new API key |
| `/api/v1/keys/[keyId]` | DELETE | Session (Pro+) | Revoke an API key |

### Response Format

```json
{
  "meta": {
    "rated_by": "airindex_v1",
    "methodology_version": "1.0",
    "last_updated": "2026-03-07T06:00:00.000Z"
  },
  "data": [...]
}
```

All keys converted to `snake_case`. Errors return `{ meta: {...}, error: "message" }`.

---

## Billing & Tiers

```
src/lib/billing.ts
src/lib/billing-shared.ts
src/lib/stripe.ts
```

### User Tiers

| Tier | Price | Access |
|------|-------|--------|
| `free` | $0 | Map, rankings, blurred detail panel |
| `pro` | $99/mo | Full dashboard, score history, corridors, filings, activity, analytics, API (100/hr) |
| `institutional` | $499/mo | API (1K/hr), data export, multi-seat |
| `enterprise` | Custom | API (10K/hr), white-label, webhooks |
| `grandfathered` | $0 | Pro access through 2026-12-31, then reverts to free |

### Tier Resolution Order (`getUserTier(userId)`)

1. Active Stripe `BillingSubscription` -> return that tier
2. `User.tier` = institutional/enterprise (admin-assigned) -> return as-is
3. Grandfathered + not expired -> return `grandfathered`
4. Created before `PAYWALL_LAUNCH_DATE` + not expired -> auto-promote to grandfathered
5. Default -> `free`

### Access Helpers

- `hasProAccess(tier)` -- true for: pro, institutional, enterprise, grandfathered
- `hasInstitutionalAccess(tier)` -- true for: institutional, enterprise

### Stripe Integration

- Lazy-initialized singleton via `getStripe()`
- Checkout: creates Stripe Checkout Session with success/cancel URLs
- Webhooks: `/api/webhook/stripe` handles `checkout.session.completed`, `customer.subscription.updated/deleted`
- Portal: `/api/billing/portal` redirects to Stripe Customer Portal for self-service

---

## Email System

```
src/lib/ses.ts (SES client, SigV4 signing)
src/lib/email.ts (templates)
```

### SES Implementation

Direct AWS Signature Version 4 signing -- no SDK dependency.
Supports `SendEmail` (simple) and `SendRawEmail` (custom headers like List-Unsubscribe).

### Email Types

| Email | Trigger | From |
|-------|---------|------|
| Magic link | User sign-in attempt | `auth@airindex.io` |
| Welcome | New user creation | `hello@airindex.io` |
| Invite | Admin approves access request | `hello@airindex.io` |
| Alert | New filing/event matches subscription | `alerts@airindex.io` |
| Weekly digest | Monday 07:00 UTC cron | `alerts@airindex.io` |
| City outreach | Manual (new market added) | `hello@airindex.io` |
| Cron failure | Any cron throws unhandled exception | `alerts@airindex.io` |
| Admin notification | New signup or sign-in | `auth@airindex.io` |

---

## Security

### CSRF Protection (`src/middleware.ts`)

- Origin/Referer header validation on all mutating endpoints (POST/PUT/PATCH/DELETE)
- Timing-safe comparison of host values
- Both headers missing = allowed (same-origin browser or non-browser client)

### Rate Limiting (`src/lib/rate-limit.ts`)

- Primary: Upstash Redis (persistent across deploys)
- Fallback: in-memory Map (auto-cleanup every 60s)
- Applied per-email (auth), per-IP (admin), per-API-key (v1 API)

### Input Validation

- All string inputs capped at 200-2000 chars
- URLs validated via regex (`/^https?:\/\//i`) before storage
- Honeypot field on contact form (bot trap)
- Email format validation

### API Key Security

- Keys SHA-256 hashed in DB (never stored plaintext)
- Shown to user exactly once on creation
- Revocable (soft delete via `revokedAt`)
- Tied to user tier at creation

### Timing-Safe Operations

- Admin PIN comparison: `crypto.timingSafeEqual`
- Cron Bearer token comparison: `crypto.timingSafeEqual`
- Admin cookie signature verification: `crypto.timingSafeEqual`

### HTTP Security Headers (`next.config.js`)

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' plausible.io sentry.io; ...
```

---

## Infrastructure & Deployment

### AWS Amplify

```
amplify.yml
```

**Build steps:**
1. `npm ci`
2. Capture env vars from Amplify console
3. `npx prisma generate`
4. `npx prisma migrate deploy` (zero-downtime migrations)
5. `npm run build`

**Cache:** `.next/cache` + `node_modules`
**Artifacts:** `.next/**/*`

### File Storage

| Environment | Path | Purpose |
|-------------|------|---------|
| Local dev | `/data/` | `ingested.json`, `ingestion-meta.json` |
| Production | `/tmp/` | Same files (ephemeral, rebuilt on first ingestion after deploy) |

**Important:** `/tmp/` resets on every deploy. Ingestion state is rebuilt from the first post-deploy run. DB state is permanent.

### Database

- **Production:** AWS RDS PostgreSQL
- **Local dev:** `localhost:5432/airindex_dev` (override in `.env.development.local`)
- **Schema changes:** Must `npx prisma db push` to both local AND production when schema changes

### GitHub Actions

All in `.github/workflows/`:

| Workflow | Trigger | What |
|----------|---------|------|
| `snapshot-cron.yml` | `cron: '0 6 * * *'` | Daily score snapshots |
| `ingest-cron.yml` | `cron: '0 6 * * *'` | Daily data ingestion |
| `digest-cron.yml` | `cron: '0 7 * * 1'` | Weekly subscriber digest |
| `auto-review-cron.yml` | `cron: '0 8 * * 1'` | Weekly AI override review |

Each workflow: health check first, then authenticated API call, failure logged to stdout.

### Dependabot

Weekly scanning for npm and GitHub Actions dependency updates.

### Branch Protection

Force push and deletion blocked on `main`.

---

## Monitoring & Alerting

### Health Endpoint

```
GET /api/health -> { status: "healthy"|"degraded", checks: { database: "ok"|"fail" }, timestamp }
```

Returns 200 (healthy) or 503 (degraded). Checked by every cron workflow before execution.

### Sentry

- Client + server + edge configs
- DSN tunneled through `/monitoring` route (bypasses ad blockers)
- 10% trace sampling
- Source maps uploaded automatically

### Cron Failure Alerts

```
src/lib/cron-alerts.ts
```

Any unhandled exception in a cron job triggers `alertCronFailure(cronName, error)`:
- Sends email to `ADMIN_NOTIFY_EMAIL` via SES
- Includes: cron name, timestamp, full error message + stack trace

### What's NOT Monitored (Gaps)

- No external uptime monitoring (UptimeRobot/Better Stack not yet configured)
- No Sentry alert rules configured (errors captured but require manual dashboard check)
- No alerting on ingestion returning 0 new records (silent failure mode)
- No alerting on API key abuse or unusual rate limit hits

---

## Environment Variables

### Required (app won't start without these)

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | JWT signing key |
| `DATABASE_URL` | PostgreSQL connection string |

### Recommended (warnings if missing, features degraded)

| Variable | Purpose |
|----------|---------|
| `ADMIN_PIN` | Admin panel second factor |
| `CRON_SECRET` | Bearer token for cron endpoints |
| `APP_URL` | Base URL for email links and callbacks |
| `SES_ACCESS_KEY_ID` | AWS SES credentials |
| `SES_SECRET_ACCESS_KEY` | AWS SES credentials |
| `ADMIN_NOTIFY_EMAIL` | Admin notification recipient |
| `UPSTASH_REDIS_REST_URL` | Persistent rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Persistent rate limiting |
| `STRIPE_SECRET_KEY` | Server-side Stripe |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Stripe product |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Stripe product |
| `STRIPE_INSTITUTIONAL_MONTHLY_PRICE_ID` | Stripe product |
| `STRIPE_INSTITUTIONAL_ANNUAL_PRICE_ID` | Stripe product |

### Optional (logged in dev only)

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude Haiku for NLP classification + auto-review |
| `LEGISCAN_API_KEY` | State legislation search |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Map rendering |
| `NEXT_PUBLIC_SENTRY_DSN` | Error tracking |
| `LOG_LEVEL` | Logging verbosity (debug/info/warn/error) |
| `PAYWALL_LAUNCH_DATE` | When paywall goes live (default: 2026-04-15) |
| `GRANDFATHERED_EXPIRY` | When grandfathered access ends (default: 2026-12-31) |
| `SES_REGION` | AWS region (default: us-east-1) |

---

## Key Files Reference

### Data & Scoring
| File | Purpose |
|------|---------|
| `src/data/seed.ts` | Static cities, operators, vertiports, corridors, STATE_TO_CITIES, MARKET_COUNT |
| `src/lib/scoring.ts` | 7-factor calculation, weights, tiers, colors |
| `src/lib/score-history.ts` | Score snapshot queries (52-week lookback, full/brief/all-cities) |
| `src/lib/score-updater.ts` | Override persistence, auto-apply, score recalculation |
| `src/lib/corridors.ts` | Corridor CRUD + caching (DB-first, seed fallback) |

### Pipelines
| File | Purpose |
|------|---------|
| `src/app/api/snapshot/route.ts` | Snapshot cron handler |
| `src/app/api/ingest/route.ts` | Ingestion cron handler |
| `src/app/api/digest/route.ts` | Digest cron handler |
| `src/app/api/admin/overrides/auto-review/route.ts` | Auto-review cron handler |
| `src/lib/ingestion.ts` | Full ingestion orchestrator |
| `src/lib/classifier.ts` | NLP classification via Claude Haiku |
| `src/lib/rules-engine.ts` | Regex-based fallback rules |
| `src/lib/auto-reviewer.ts` | AI-powered override review + auto-promotion |
| `src/lib/notifications.ts` | Subscriber digest + alert emails |
| `src/lib/cron-alerts.ts` | Failure alerting |

### External APIs
| File | Purpose |
|------|---------|
| `src/lib/faa-api.ts` | Federal Register, LegiScan, SEC EDGAR integrations |
| `src/lib/congress-api.ts` | Congress.gov curated federal bill tracking |
| `src/lib/regulations-api.ts` | Regulations.gov FAA docket search |
| `src/lib/operator-news.ts` | Google News RSS parsing for operator/industry news |

### Auth & Admin
| File | Purpose |
|------|---------|
| `src/auth.ts` | NextAuth config, magic link, tier refresh in JWT |
| `src/middleware.ts` | CSRF protection, route matching |
| `src/lib/admin-auth.ts` | Admin cookie signing/verification |
| `src/lib/admin-helpers.ts` | requireAdmin, authorizeCron, getClientIp |
| `src/lib/admin.ts` | Override approve/reject, scoring recalculation |

### API v1
| File | Purpose |
|------|---------|
| `src/lib/api/middleware.ts` | Bearer token auth + tier-based rate limiting |
| `src/lib/api/keys.ts` | Key generation, validation, revocation |
| `src/lib/api/transforms.ts` | snake_case conversion, response envelope, error formatting |
| `src/lib/api/market-transforms.ts` | Market summary/detail/history response transforms |
| `src/app/api/v1/markets/route.ts` | GET /markets |
| `src/app/api/v1/markets/[cityId]/route.ts` | GET /markets/:cityId |
| `src/app/api/v1/markets/[cityId]/history/route.ts` | GET /markets/:cityId/history |
| `src/app/api/v1/markets/export/route.ts` | GET /markets/export |
| `src/app/api/v1/keys/route.ts` | GET/POST /keys |
| `src/app/api/v1/keys/[keyId]/route.ts` | DELETE /keys/:keyId |

### Infrastructure
| File | Purpose |
|------|---------|
| `src/lib/rate-limit.ts` | Upstash Redis + in-memory fallback |
| `src/lib/env.ts` | 3-tier env var validation |
| `src/lib/ses.ts` | AWS SES SigV4 client |
| `src/lib/email.ts` | Email templates (alert, digest, outreach, cron failure) |
| `src/lib/stripe.ts` | Stripe client singleton, price helpers |
| `src/lib/billing.ts` | Tier resolution, Pro/Institutional access gates |
| `src/lib/billing-shared.ts` | Client-safe tier helpers (no server imports) |
| `src/lib/logger.ts` | Log level gating (LOG_LEVEL env, prod suppresses debug+info) |
| `next.config.js` | Security headers, CSP, Sentry tunnel, webpack config |
| `amplify.yml` | AWS Amplify build/deploy config |
| `prisma/schema.prisma` | Full database schema |

### Dashboard (Frontend)
| File | Purpose |
|------|---------|
| `src/components/Dashboard.tsx` | Orchestrator (state, effects, layout shell) |
| `src/components/DashboardHeader.tsx` | Logo, stat pills, admin link, auth |
| `src/components/CityListPanel.tsx` | Left panel: filter pills + city list |
| `src/components/CityDetailPanel.tsx` | Right panel: score, breakdown, operators, corridors |
| `src/components/tabs/MapTab.tsx` | Mapbox map view |
| `src/components/tabs/RankingsTab.tsx` | Sortable rankings table |
| `src/components/tabs/CorridorsTab.tsx` | Corridor list with search/filter/sort |
| `src/components/tabs/FilingsTab.tsx` | SEC/federal filings feed |
| `src/components/tabs/ActivityTab.tsx` | Changelog activity feed |
| `src/components/tabs/AnalyticsTab.tsx` | Charts: tier distribution, city comparisons, corridor analytics |
| `src/components/tabs/KeysTab.tsx` | API key management (Pro+) |

---

## What's Automated vs Manual

### Fully Automated (no human intervention)

| Process | Schedule | Notes |
|---------|----------|-------|
| Score snapshots | Daily 06:00 UTC | Captures all tracked markets |
| Data ingestion | Daily 06:00 UTC | 4 sources, classify, generate overrides |
| High-confidence override application | During ingestion | Rules engine signed-legislation detection |
| Subscriber digest emails | Weekly Mon 07:00 UTC | Filtered by subscription preferences |
| AI auto-review | Weekly Mon 08:00 UTC | Approves/rejects/promotes overrides above confidence threshold |
| Cron failure alerts | On exception | Email to admin |
| Health checks | Before each cron | DB connectivity test |
| Magic link auth | On-demand | Rate limited, 10-min expiry |
| Stripe webhook processing | On-demand | Subscription state sync |
| Admin login notifications | On sign-in/sign-up | Email to admin |

### Semi-Automated (automated detection, manual action required)

| Process | What's Automated | What's Manual |
|---------|-----------------|---------------|
| Medium/needs_review overrides | Detected and queued by NLP/rules | Admin must approve or reject in admin panel |
| AI auto-review skips | AI evaluates but confidence too low | Admin reviews AI reasoning, makes final call |
| Unresolved city overrides | Flagged as `__unresolved__` | Admin assigns correct city during approval |
| Access requests | Form submission + DB record | Admin approves/rejects in admin panel |
| Corridor status updates | Detected from filings | Auto-applied if confidence high, else manual |

### Fully Manual (no automation)

| Process | How | Notes |
|---------|-----|-------|
| Adding new markets | Edit `src/data/seed.ts`, deploy | Research required: 7-factor scoring, coordinates, notes |
| Market lead triage | Admin panel Watchlist tab | new -> researching -> verified -> added/dismissed |
| Seed data audits | Periodic manual review | Operators, vertiport counts, active programs |
| Tier assignment (enterprise) | Admin panel Billing tab | For enterprise/institutional overrides |
| Corridor CRUD | Admin panel Corridors tab | Create, edit status, delete |
| City outreach emails | Manual trigger | Per-market introduction emails |
| Stripe product setup | Stripe Dashboard | Price IDs set as env vars |
| DNS/domain management | AWS Route 53 + SES console | MX records, DKIM, SPF |
| Database migrations | `npx prisma migrate deploy` | Run against both local and prod |
| Dependabot PR merges | GitHub PR review | Weekly automated PRs, manual merge |

---

## Known Gaps & TODOs

### Monitoring
- [ ] External uptime monitoring (UptimeRobot or Better Stack) -- ping `/api/health` every 5 min
- [ ] Sentry alert rules -- email on error spikes (>5 errors in 10 min)
- [ ] Alert on zero-record ingestion runs (silent failure)
- [ ] Alert on unusual API rate limit activity

### Data Pipeline
- [ ] `/tmp/` ingestion state is ephemeral on Amplify -- lost on every deploy, rebuilt on next run (no data loss, just re-processes recent records)
- [ ] No dedup across deploys for ingested records (mitigated by DB-level dedup on overrides)
- [ ] Google News RSS is fragile (no API key, can be throttled)
- [ ] LegiScan free tier has limited API calls -- 51 states per run could hit limits

### Scoring
- [ ] AI-assisted scoring override recommendations (Haiku -> specific factor change suggestions -> admin approve/reject) -- partially built via auto-reviewer `__review__` flow
- [ ] No automated re-scoring when seed data changes (requires deploy + snapshot cron)

### Auth
- [ ] Google/GitHub OAuth alongside magic link (if audience demands it)
- [ ] No session refresh on tier change (user must re-login to pick up new tier in JWT)

### Business
- [ ] Post-signup segmentation question ("What best describes you?") -- don't build until signups flowing
- [ ] Paywall not yet live -- "Coming soon" on pricing buttons, flip by removing from `PricingTiers.tsx`
- [ ] Institutional Stripe products need creation before paywall launch
