# Project Status: India EV Charging Station Directory API

Last Updated: 2026-10-15
Phase: Live on BEE data (29184 stations, till 26 Oct 2025); production checks pass.

## Current State

- **Repo / main:** `E:\OSC\api-projects\projects\ev-charging-stations-api`, on `main`. Playground moves selected map pins to top of results list with highlight, and centers map with offset [0, 80] preventing popup overflow/clipping.
- **Live site:** `https://ev-charging-stations-api.vercel.app` serves BEE's "EV Public Charging Stations Data till 26th October 2025". Production deployment `7098515522` → `success`; `/health` answers 200.
- **Source:** BEE PDF (http only), sha256 `f519218fa96a04f57b3c56e919a8045133e7df1307a77710cca0076ab25b6882`, 7942286 bytes, republished with attribution string on every response (`DOCS/DATA-NOTES.md`).
- **Dataset:** 29,184 stations / 39,640 chargers / 44,065 connectors, 36 states and UTs, 70 operators, 115 suspect coordinates flagged, 1 row rejected.
- **API:** strict validation, per-gun filters, paged radius search, `/v1/stations/near/pins`, `/v1/cities`, CDN caching, 429 with Retry-After. `npm test` → 135 pass, 0 fail.
- **Frontend:** real data, on-demand query, MapLibre map with all matching pins, Google Maps external links, graphite/amber palette. Frontend 19 + 2 tests pass, build renders 8 pages + 404.html, SEO 0 errors.
- **Deploy config:** `vercel.json` runs function in `bom1`, ships `backend/data/**`. CI green.
- **Evidence:** production checklist `api-projects/checklists/ev-charging-stations/production.md` (14 rows, 0 FAIL).

## Constraints and blockers

- Any push to `main` deploys production; always verify tests and build beforehand.
- Never stop servers on ports 3000/5173. Run the five verification steps: `npm test`, `npm --prefix frontend test`, `npm --prefix frontend run build`, `npm --prefix frontend run test:build`, `npm run verify:seo`.
- Prerender prints a react-router `useLayoutEffect` SSR warning (logged, harmless).
- Git Bash: `export MSYS_NO_PATHCONV=1` before commands that pass `/route` arguments.

## Next up (start here)

1. Verify live deployment on Vercel at `https://ev-charging-stations-api.vercel.app/playground`.
2. Owner's call: public-apis submission row-shape in `api.json` (shorten description to <= 100 chars without trailing period).
3. Re-run `run-checks.js --stage production` after any change to manifest, pages or guides.
