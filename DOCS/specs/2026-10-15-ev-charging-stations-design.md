# India EV Charging Station Directory API — Design Spec

**Date:** 2026-10-15  
**Status:** Approved for planning  
**Project:** `ev-charging-stations-api`  

---

## 1. Product Summary & Visual Identity

### Problem Statement
India has 27,000+ public electric vehicle charging stations across states and highways, but developers building route planners, range anxiety calculators, navigation tools, and fleet apps have no free, open, keyless REST API. Existing options are either drastically incomplete (Open Charge Map has <2% India coverage and requires keys), pay-per-call (Google Places), or locked behind enterprise B2B sales (CPOs).

### Product Boundaries
- **In Scope:** Static directory of public charging stations with exact latitude/longitude coordinates, state/city/district, address, operator type, connector types (CCS-2, Type-2 AC, Bharat DC-001, GB/T, CHAdeMO), and power ratings (kW). High-speed spatial radius lookups.
- **Explicitly Out of Scope:** Real-time connector occupancy/availability (requires live CPO telemetry), payment processing, and reservation/booking.

### Visual & Brand Identity (Anti-AI-Slop)
- **Palette:** High-voltage cyan/emerald accent (`#10b981` / `#06b6d4`), deep slate/carbon backdrop (`#0f172a`), muted silver borders (`#334155`). Evokes modern EV battery/grid infrastructure, completely distinct from agricultural earth tones (mandi) or calendar dark modes.
- **Typography:** Crisp monospace for connector ratings, power specs, and endpoints; high-legibility sans-serif for station directories.
- **Interactive Component:** Station search with interactive radius preview, connector type filter badges, and immediate JSON response viewer.

---

## 2. Architecture & Data Model

### Data Pipeline & Storage
- **Source:** Official Open Government Data (`data.gov.in`) dataset: *State, District, City and Location wise Electric Vehicle (EV) Charging Stations in India* under GODL-India.
- **Storage Strategy:** Embedded SQLite (`better-sqlite3`) bundled inside the deployment.
  - Table: `stations` (id, name, state, district, city, address, latitude, longitude, operator, connectors_json, total_capacity_kw, raw_meta)
  - Indexing: Compound index on `(state, city)`, index on `operator`, spatial bounding box index on `(latitude, longitude)`.
  - Geo Distance Math: Haversine distance algorithm implemented directly in SQL/service layer for `/v1/stations/near`.
  - Footprint: ~27,000 records, ~8MB SQLite file. Zero external database required.

### Server & Hosting Strategy
- **Backend:** Node.js Express server running as a Vercel Serverless Function (`api/index.js`) with bundled SQLite database.
- **Frontend:** React + Vite + Tailwind CSS static portal deployed to Vercel CDN.
- **Cost:** $0 / month (Vercel Hobby tier).

---

## 3. API Contract & Response Envelope

### Standard Envelope Invariants (`CONVENTIONS.md`)
All responses follow the canonical envelope structure:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "count": 25,
    "total": 27000,
    "page": 1,
    "limit": 25,
    "filters": { "state": "Karnataka", "connector": "CCS-2" }
  }
}
```

Error envelope:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_COORDINATES",
    "message": "Latitude must be between -90 and 90, and longitude between -180 and 180."
  }
}
```

### Endpoints (v1)

1. `GET /v1/stations`
   - **Query Params:** `state`, `city`, `operator`, `connector`, `min_power_kw`, `page` (default 1), `limit` (default 25, max 100).
   - **Response:** Paginated list of matching EV stations.

2. `GET /v1/stations/near`
   - **Query Params:** `lat` (required), `lng` (required), `radius` (km, default 10, max 100), `limit` (default 25).
   - **Response:** Nearest stations ordered by distance (`distance_km` in payload).
   - **Validation:** 400 if `lat` or `lng` missing or out of geographic bounds.

3. `GET /v1/stations/:id`
   - **Param:** Numeric station ID.
   - **Response:** Single station object with full connector breakdowns, coordinates, operator, address. 404 if not found.

4. `GET /v1/states`
   - **Response:** Summary breakdown of all Indian States and Union Territories with total public station counts and top operators.

5. `GET /v1/connectors`
   - **Response:** Reference dictionary of supported connector types (`CCS-2`, `Type-2 AC`, `Bharat DC-001`, `GB/T`, `CHAdeMO`), voltage/power standards, and compatible vehicles in India.

6. `GET /health`
   - **Response:** 200 `{ "status": "ok", "service": "ev-charging-stations-api", "version": "1.0.0", "stations_indexed": 27000 }`.

---

## 4. Technical SEO & Routing Invariants

- **Canonical URLs & SSG:** Prerendered HTML generated during build (`prerender.mjs`) for `/`, `/docs`, `/playground`, `/status`, and `/guides/:slug`.
- **Structured Data:** Schema.org `WebAPI` and `TechArticle` JSON-LD embedded on all documentation and guide pages.
- **Routing Configuration (`vercel.json`):**
  - Explicit rewrites for `/v1/(.*)` and `/health` to `/api/index.js`.
  - Explicit rewrites for each prerendered page to `/route/index.html`.
  - **Zero wildcard catch-all rewrites** to prevent 200 status on broken paths.
  - Standalone `dist/404.html` returned with HTTP 404 for unknown routes.
- **Sitemap & Robots:** Auto-generated `sitemap.xml` pointing to `https://ev-charging-stations-api.vercel.app/sitemap.xml`.

---

## 5. Quality & Verification Gates

1. **Unit & Integration Tests:**
   - 100% route coverage across all 5 endpoints.
   - Bounding-box and Haversine geo-radius verification against benchmark coordinates (e.g. Connaught Place Delhi, MG Road Bangalore).
   - Param validation: missing params -> 400, unknown enum -> 404 with allowed values list.
2. **Quality Gates:**
   - `no-ai-slop` (zero generic template patterns in UI/code).
   - `no-ai-slop-writing` (clean, human, technical documentation without AI buzzwords).
   - `security-review` (strict rate limiting, input sanitization, zero secret leaks).
   - `prod-bug-auditor` (8-dimension production readiness scorecard).
