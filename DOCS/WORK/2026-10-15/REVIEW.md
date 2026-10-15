# Review — 15/10/2026

Reproduced on a local server (`node backend/src/index.js`) and against the live
deployment, before the rebuild in `PLAN.md` started.

## What was wrong

### The data

- `backend/data/stations.json` (28,698 stations) came from `backend/scripts/generate-data.js`, a seeded random generator. The first build commit (`a89b363`) labelled it official Ministry of Power / BEE data with a fabricated `verified_at`. A later commit (`04c1f18`) relabelled it as "generated sample" but kept serving it publicly.
- Station names paired real operator brands with invented locations (e.g. `Statiq - Mumbai Municipal Multi-level Car Parking #1`).
- The scout's research note cited data.gov.in as the source. data.gov.in has only state/city aggregate tables (39 entries, all Rajya Sabha answers, checked through `api.data.gov.in/lists`). The station-level list is a BEE PDF, which nobody downloaded.

### API (local reproduction)

| Id | Request | Observed |
|---|---|---|
| A1 | `/v1/stations?min_power=50&limit=1`, `?offset=50` | 200, unfiltered — unknown parameters silently ignored |
| A2 | `min_power_kw=50` | filters on the station's summed capacity; 5,708 stations matched with no charger ≥ 50 kW |
| A3 | `city=Prayagraj`, `city=Allahabad` | both 400; alias table maps `prayagraj → allahabad` (backwards) |
| A4 | `city=Delhi` | returns only New Delhi |
| A5 | `operator=zzz` | 200 empty (state/city unknowns are 400); `operator=a` matches nearly all |
| A6 | `/v1/stations/near?...&page=2` | `page` ignored; results beyond `limit` (max 100) unreachable |
| A7 | `lat=0x10` | accepted as 16 |
| A8 | `POST /v1/stations` | 404 ROUTE_NOT_FOUND instead of 405 |
| A9 | dataset | opening hours both `24x7` and `00:00-24:00`; `access_type`, `status` constant |
| A10 | city lookup | keyed by city only; ambiguous when a city name exists in two states |

### Live deployment (`https://ev-charging-stations-api.vercel.app`)

- Function region `iad1` (`x-vercel-id: bom1::iad1::…`); uncached requests from India 470–515 ms.
- CDN-cached responses carried a previous caller's `RateLimit-Remaining`.
- In-memory rate limiter is per instance, so only a soft limit.

### Frontend

- `maplibre-gl.css` imported nowhere; the built CSS had no MapLibre rules, so popups and controls rendered unstyled.
- Map `is_fast_dc` and playground power options were based on the fake summed capacity.
- `frontend/package.json` depended on the whole repo (`file:..`), unused.

### Uncommitted changes left by the last agent

- `vercel.json` with all rewrites, function config and headers removed (would 404 every `/v1` route if deployed).
- An unused `"frontend"` key in `package.json`, unused `vercel:*` scripts, and a root `.env.production` that Vite never reads.

## Superseded plans

- `2026-10-15-ev-charging-stations-plan.md` — superseded by `PLAN.md` (rebuild on BEE data), owner instruction 15/10/2026.
- `PLAN-MAP-INTEGRATION.md` — superseded by `PLAN.md`, owner instruction 15/10/2026.
- `AUDIT-2026-10-15.md` — the previous agent's audit; kept as history.

## Open items carried

- Data ingestion (old plan Task 1.2, never done, faked instead) → `PLAN.md` Phase 2.
- Map integration (MapLibre in place; CSS and fast-charger logic broken) → `PLAN.md` Task 4.3.
- Deploy hardening → `PLAN.md` Phase 5.
- Everything else in the old plans was built; the defects above are carried as `PLAN.md` tasks. Nothing dropped.
