# India EV Charging Station Directory API

A keyless REST API for Indian public electric vehicle charging stations: radius search around any
coordinate, filtering by state, city, operator, connector and capacity, plus a reference dictionary
of Indian charging standards.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./package.json)
[![Auth: none](https://img.shields.io/badge/auth-none-success)]()
[![CORS: open](https://img.shields.io/badge/cors-open-brightgreen)]()
[![Dataset: generated sample](https://img.shields.io/badge/dataset-generated%20sample-orange)](DOCS/AUDIT-2026-10-15.md)

> **Data status: generated sample.** The bundled dataset is synthetic, produced by
> `backend/scripts/generate-data.js`. It has a realistic shape — per-station coordinates, connector
> mixes, capacities, states, districts and operators — but the stations are invented. Use it for
> development and evaluation, not for navigation, dispatch or vehicle routing. It is **not** official
> Government of India data.
>
> The intended source is the Ministry of Power / Bureau of Energy Efficiency dataset
> *"State, District, City and Location wise Electric Vehicle (EV) Charging Stations in India"*
> published on [data.gov.in](https://data.gov.in) under GODL-India. That dataset carries per-station
> latitude/longitude, charge point operator, charger type and charger rating, and maps onto the
> records this project produces. Ingesting it is the next substantive step; see
> [Replacing the dataset](#replacing-the-dataset).

Nothing here is deployed yet. There is no live host for this project, so no canonical URL, sitemap
or badge points at one.

---

## Endpoints

Every route is a `GET` returning JSON, with no authentication and CORS open to all origins. All
responses share one envelope:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "took_ms": 4.2, "...": "endpoint-specific fields" }
}
```

| Endpoint | Query parameters | Returns |
|---|---|---|
| `GET /v1` | — | Self-describing index of endpoints and the active rate limit |
| `GET /v1/stations` | `state`, `city`, `operator`, `connector`, `min_power_kw`, `page`, `limit` | Paginated directory |
| `GET /v1/stations/near` | `lat`*, `lng`*, `radius`, `limit`, `connector`, `min_power_kw`, `operator` | Stations in a radius, nearest first |
| `GET /v1/stations/{id}` | — | One station by integer id |
| `GET /v1/states` | — | Station and capacity totals per state and UT |
| `GET /v1/operators` | — | Charge point operators with station counts |
| `GET /v1/connectors` | — | Connector reference dictionary |
| `GET /v1/meta` | — | Provenance, coverage counts and snapshot date |
| `GET /health` | — | Liveness probe |

\* required

### Quick start

```bash
# Start the API locally (port 3000)
npm install
npm start

# Radius search: 10 km around MG Road, Bengaluru, only CCS-2 stations
curl -s "http://localhost:3000/v1/stations/near?lat=12.9716&lng=77.5946&radius=10&connector=CCS-2&limit=2"

# Directory: Karnataka stations with at least 142 kW of capacity
curl -s "http://localhost:3000/v1/stations?state=KA&min_power_kw=142&limit=5"

# Coverage
curl -s "http://localhost:3000/v1/meta"
```

Rate limits are applied **per client address** (300 requests per 15 minutes by default), so one heavy
caller cannot exhaust another's budget. Responses carry `RateLimit-Limit`, `RateLimit-Remaining` and
`RateLimit-Reset`; a `429` also carries `Retry-After` in seconds.

### Parameter rules

Invalid input returns `400` with a stable machine-readable code — parameters are never silently
ignored or rewritten:

| Code | Meaning |
|---|---|
| `INVALID_PARAMETER` | A numeric parameter was malformed or out of range; `details.parameter` names it |
| `MISSING_COORDINATES` | `lat` or `lng` was absent on `/v1/stations/near` |
| `INVALID_LATITUDE` / `INVALID_LONGITUDE` | Coordinate outside -90..90 / -180..180 |
| `UNKNOWN_STATE` / `UNKNOWN_CITY` / `UNKNOWN_CONNECTOR` | No match in the dataset |
| `INVALID_STATION_ID` | The id segment is not a positive integer (`1.5`, `1e3`, `abc` are rejected) |
| `STATION_NOT_FOUND` | Well-formed id with no matching record |
| `RATE_LIMIT_EXCEEDED` | Per-client budget exhausted |
| `ROUTE_NOT_FOUND` | Path is not an endpoint |

`state`, `city`, `operator` and `connector` are trimmed and compared case-insensitively.
Connector spellings are normalised (`CCS-2`, `CCS 2`, `ccs2`, `Combo Type 2` all resolve), and common
city aliases are resolved (`Bangalore` → Bengaluru, `Bombay` → Mumbai, `Gurgaon` → Gurugram).

Filters on `/v1/stations/near` are applied **before** the nearest-first sort, so `meta.total_found`
counts matches inside the radius rather than matches on the page you received.

---

## Architecture

- **Backend:** Node.js + Express, in-memory spatial index over the JSON dataset. No database, so it
  deploys as a single serverless function.
- **Frontend:** React 18 + Vite, statically prerendered (8 pages, `404.html`, and — when `SITE_URL` is
  configured — `sitemap.xml` and `robots.txt`).
- **Map:** MapLibre GL with [OpenFreeMap](https://openfreemap.org) vector tiles. Keyless, no
  registration and no request limits, unlike CARTO (which now requires an API key) and
  `tile.openstreetmap.org` (whose tile-usage policy rules out application use).

## Local development

```bash
npm install
cd frontend && npm install && cd ..

npm test              # 36 backend integration tests (node --test)
npm start             # API on http://localhost:3000

cd frontend
npm run dev           # portal on http://localhost:5173, proxying /v1 to :3000
npm run build         # vite build + prerender
npm run verify:seo    # SEO gate over the built output
```

## Deployment

The build derives its canonical origin from `SITE_URL` (or, on Vercel, automatically from
`VERCEL_PROJECT_PRODUCTION_URL`). **If no origin is configured, the build deliberately omits
canonical tags, `og:image`, `sitemap.xml` and `robots.txt`** instead of inviting crawlers to a host
that is not serving the site. `npm run verify:seo` will fail on such a build, which is the intended
signal that it is not production-ready.

```bash
SITE_URL=https://your-origin.example npm run build
npx vercel --prod        # then verify:
curl -s https://your-origin.example/health
```

`npm run verify:seo` inspects `frontend/dist` on disk and is the authoritative check of the
prerendered output. `npm run preview` serves the SPA shell (it does not apply `vercel.json`
rewrites), so use it to exercise client-side behaviour and the SEO gate for per-page HTML.

`api.json` carries the manifest for the OSC pipeline; `node api-projects/pipeline/manifest/manifest.js
validate <projectDir>` checks it.

## The dataset

`backend/data/` holds the generated sample dataset:

| File | Contents |
|---|---|
| `stations.json` | One record per station: id, name, operator, state/UT, district, city, address, coordinates, connectors, capacity, availability |
| `states.json` | Per-state aggregates with leading operators and cities |
| `connectors.json` | Curated connector reference (not generated) |
| `meta.json` | Provenance, coverage counts and snapshot date |

Generation is **deterministic** (seeded `mulberry32`), so re-running produces byte-identical files:

```bash
node backend/scripts/generate-data.js          # uses DATASET_SEED, default 20261015
DATASET_SEED=7 node backend/scripts/generate-data.js
```

`/v1/meta` reports `dataset_status: "generated-sample"` and `provenance.is_official: false`. The
footer, status page and API reference all surface this to end users, and a backend test asserts it, so
the disclosure cannot silently regress.

### Replacing the dataset

1. Obtain the official dataset. It carries `state`, `district_as_per_lgd`, `district_lgd_code`,
   `city_village`, `location_name`, `latitude`, `longitude`, `chargers_type`, `charger_rating`,
   `connector_rating`, `total_connectors`, `charge_point_operators` and `govt_private`.
2. Transform rows into the `stations.json` shape (one record per station, with a `connectors` array).
3. Rewrite `meta.json` with `dataset_status: "official"`, `provenance.is_official: true` and the real
   licence, then regenerate `states.json` aggregates.
4. Re-run `npm test`, `npm run build` and `npm run verify:seo`.

The UI needs no changes: counts, coverage, connector tables and the status page all derive from
`backend/data/` at build time.

## Documentation

- [`DOCS/AUDIT-2026-10-15.md`](DOCS/AUDIT-2026-10-15.md) — the production audit that produced this
  revision: every defect found, with the commands that reproduced it.
- [`DOCS/DECISIONS.md`](DOCS/DECISIONS.md) — architecture and design decisions log.

## Licence

Code: MIT. The bundled dataset is generated and carries no upstream licence; the intended licence on
ingest is [GODL-India](https://data.gov.in/godl).
