# Project Status: India EV Charging Station Directory API

Last Updated: 2026-10-15
Phase: Rebuilding on real BEE data (`PLAN.md`), Phase 4 done

## Current State

- **Work branch:** `rebuild/bee-real-data`. Nothing from it is on `main`; the owner has not authorised a merge.
- **Live site** (`https://ev-charging-stations-api.vercel.app`, deployed from `main`): still serves the old generated sample (28,698 invented stations) until the rebuild ships.
- **Real source found:** BEE "EV Public Charging Stations Data till 26th October 2025" (PDF, 1,159 pages, 39,641 charger rows). data.gov.in has only aggregate tables. Details in `PLAN.md` Facts.
- **Real dataset built:** 29,184 stations / 39,640 chargers from all 39,641 PDF rows (1 rejected), 36 states/UTs, 70 operators, 115 suspect coordinates flagged. Ingestion: `ingest/` (Python, PDF only) → `backend/scripts/build-dataset.js`. Notes: `DOCS/DATA-NOTES.md`.
- **API (branch):** new contract on real data — strict validation, per-gun vehicle/current/connector/power filters, paged radius search excluding suspect locations, `/v1/cities`, attribution on every response, CDN-safe caching, 429 with Retry-After. `npm test` → 119 pass, 0 fail. Local cold start 352 ms, warm ~12 ms.
- **Test matrix:** 64 of 95 rows proven; the rest are frontend, CI and deployment rows for Phases 4–6.
- **Done:** junk deploy-config edits discarded; old plans archived in `DOCS/WORK/2026-10-15/` with `REVIEW.md`; test matrix `DOCS/TEST-MATRIX.md` (95 rows, all unproven).

## Next up (start here)

1. Phase 5 starts at Task 5.1 (vercel.json: bom1, includeFiles). Re-read the Vercel brief's TTL first (PLAN Phase 5 "Re-check first").
2. Phase 5 (rest): Task 5.2 CI + weekly BEE check, api.json and README.
3. Phase 6: review, preview deploy, smoke test. No merge to main without the owner.

Mobile-check (Task 4.5) done: no blockers or majors, see `MOBILE.md`. Probe with one viewport per browser launch (cache issue noted there). Preview: `PORT=3920 npm start`, then `API_PROXY_TARGET=http://localhost:3920 npx vite preview --port 4180` in frontend/ (ports 3000/5173 belong to the previous agent).

Overall: about 75% done (Phases 1–4 done; palette reviewed in a browser: consistent at desktop and phone).

## Plan issues

1. Extractor test runs as `python -I ingest/test_extract.py`; page 1159 has 37 rows (local fix).
2. Charger power is modelled per gun (`guns[].kw`, `max_power_kw`, `max_kw_by_standard`), because combo chargers list per-gun ratings and a vehicle receives the gun rating. `min_power_kw` filters on gun power. API contract amended.
