# Indian EV Charging Station Directory API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship `ev-charging-stations-api`, a free, keyless, production-grade REST API and developer portal for India's 27,000+ public electric vehicle charging stations, connectors, and power ratings, verified for `public-apis` submission.

**Architecture:**
- **Backend:** Node.js (>=20) Express API structured under `/v1`, backed by an embedded SQLite database (`better-sqlite3`) with spatial bounding box and Haversine distance calculations.
- **Frontend:** React + Vite + Tailwind CSS developer portal with interactive Station Finder / Geo-Playground, Documentation, Guides, and Status page.
- **SEO & Routing:** Prerendered static HTML (`scripts/prerender.mjs`), Schema.org JSON-LD, `sitemap.xml`, `robots.txt`, and strict Vercel configuration without catch-all wildcards.
- **Hosting:** Vercel Serverless Functions (`api/index.js`) + Vercel CDN frontend ($0/month).

---

## Phases & Tasks

### Phase 1: Data Model, Ingestion & SQLite Database Setup
- [ ] **Task 1.1: Root project setup**
  - Setup root `package.json` with scripts (`start`, `build`, `test`), dependencies (`express`, `cors`, `express-rate-limit`, `better-sqlite3`).
- [ ] **Task 1.2: Normalized Dataset Ingestion Script**
  - Write `backend/scripts/seed-stations.js` to parse and normalize the 27,000+ station records from `data.gov.in`.
  - Clean station fields: `name`, `state`, `district`, `city`, `address`, `latitude`, `longitude`, `operator`, `connectors` (JSON array of `{ type, power_kw, count }`), `total_capacity_kw`.
  - Create SQLite schema with indexes on `(state, city)`, `operator`, `(latitude, longitude)`.
  - Build `backend/data/stations.db` and output dataset summary stats.

### Phase 2: Express Backend Core & Service Layer
- [ ] **Task 2.1: Express Application & Envelopes (`backend/src/app.js`)**
  - Configure Express with CORS (`*`), JSON parser, rate limiter (100 req/15 min default).
  - Implement standard response envelopes (`success: true, data, meta` and `success: false, error: { code, message }`).
  - Add `/health` route returning status 200 with service metadata and station count.
- [ ] **Task 2.2: Stations Query Service (`backend/src/services/stations-service.js`)**
  - Implement query filters: `state`, `city`, `operator`, `connector`, `min_power_kw` with pagination (`page`, `limit`).
  - Implement Haversine geo-distance spatial query for `/v1/stations/near` with radius boundary filtering.
  - Implement state aggregate counts and connector reference dictionary.

### Phase 3: Route Handlers & Parameter Validation
- [ ] **Task 3.1: Station Endpoints (`backend/src/routes/stations.js`)**
  - `GET /v1/stations` (paginated list with multi-parameter filtering).
  - `GET /v1/stations/near` (lat, lng, radius validation; returns sorted nearest stations with `distance_km`).
  - `GET /v1/stations/:id` (individual station lookup, returns 404 with error envelope if not found).
- [ ] **Task 3.2: Reference Endpoints (`backend/src/routes/reference.js`)**
  - `GET /v1/states` (state-wise station counts, top operators).
  - `GET /v1/connectors` (dictionary of Indian EV connector standards: CCS-2, Type-2, Bharat DC-001, GB/T, CHAdeMO).

### Phase 4: Backend Automated Test Suite
- [ ] **Task 4.1: Integration Tests (`backend/test/api.test.js`)**
  - Test `/health` returns 200.
  - Test `/v1/stations` returns valid envelope and pagination.
  - Test `/v1/stations/near` with valid coordinates (e.g. Bangalore / Delhi) returns sorted distances.
  - Test invalid coordinates (out of bounds or missing) return 400.
  - Test non-existent station ID returns 404.
  - Test CORS headers and error structures.

### Phase 5: Frontend Developer Portal
- [ ] **Task 5.1: Frontend Scaffolding (`frontend/`)**
  - Setup Vite + React + Tailwind CSS in `frontend/`.
  - Build high-voltage cyan/emerald battery/grid brand aesthetic.
- [ ] **Task 5.2: Pages & Components**
  - **Home:** Hero, interactive API curl playground, feature highlights.
  - **Docs:** Complete endpoint specifications, query params, code snippets in cURL/JS/Python.
  - **Playground:** Real-time station search by state/city or browser geo-location.
  - **Guides:** Technical integration guides (e.g., building an EV route planner, calculating range).
  - **Status:** Health monitor, database statistics, freshness metadata.

### Phase 6: Technical SEO, Prerendering & Vercel Config
- [ ] **Task 6.1: Prerender Script (`frontend/scripts/prerender.mjs`)**
  - Prerender static HTML for all routes into `dist/` with Schema.org `WebAPI` JSON-LD.
  - Generate static `dist/404.html`.
- [ ] **Task 6.2: Sitemap & Robots Generator**
  - Generate `dist/sitemap.xml` and `dist/robots.txt`.
- [ ] **Task 6.3: Vercel Serverless Function & Rewrite Rules (`vercel.json`)**
  - Create `api/index.js` exporting backend app.
  - Setup explicit rewrites for `/v1/(.*)`, `/health`, and static pages with zero catch-all wildcards.

### Phase 7: Quality Gates & Verification
- [ ] **Task 7.1: Quality Audits**
  - Run `no-ai-slop` verification on frontend and backend code.
  - Run `no-ai-slop-writing` on docs and README.
  - Run security and production readiness checks.
- [ ] **Task 7.2: Live Verification & Hand-off**
  - Run local end-to-end smoke tests.
  - Output deploy checklist and submission readiness summary.
