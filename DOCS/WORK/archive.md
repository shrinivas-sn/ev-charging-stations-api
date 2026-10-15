# STATUS archive

Lines moved verbatim out of `STATUS.md` when they went stale.

## 15/10/2026

- **Test matrix:** 64 of 95 rows proven; the rest are frontend, CI and deployment rows for Phases 4–6.
- **Done:** junk deploy-config edits discarded; old plans archived in `DOCS/WORK/2026-10-15/` with `REVIEW.md`; test matrix `DOCS/TEST-MATRIX.md` (95 rows, all unproven).

Mobile-check (Task 4.5) done: no blockers or majors, see `MOBILE.md`. Probe with one viewport per browser launch (cache issue noted there). Preview: `PORT=3920 npm start`, then `API_PROXY_TARGET=http://localhost:3920 npx vite preview --port 4180` in frontend/ (ports 3000/5173 belong to the previous agent).

Overall: about 75% done (Phases 1–4 done; palette reviewed in a browser: consistent at desktop and phone).

## Plan issues

1. Extractor test runs as `python -I ingest/test_extract.py`; page 1159 has 37 rows (local fix).
2. Charger power is modelled per gun (`guns[].kw`, `max_power_kw`, `max_kw_by_standard`), because combo chargers list per-gun ratings and a vehicle receives the gun rating. `min_power_kw` filters on gun power. API contract amended.
