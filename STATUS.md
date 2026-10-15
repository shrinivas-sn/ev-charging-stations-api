# Project Status: India EV Charging Station Directory API

Last Updated: 2026-10-15
Phase: Rebuilding on real BEE data — Phases 1–4 done (about 75%); remaining work in `PLAN.md`

## Current State

- **Path / branch:** `E:\OSC\api-projects\projects\ev-charging-stations-api`, branch `rebuild/bee-real-data` (local only, never pushed). Nothing is on `main`; the owner has not authorised a merge.
- **Live site** (`https://ev-charging-stations-api.vercel.app`, deployed from `main`): still serves the old generated sample (28,698 invented stations) until the rebuild ships.
- **Real source:** BEE "EV Public Charging Stations Data till 26th October 2025" (PDF, http only). Republished with attribution; BEE publishes no licence. Notes: `DOCS/DATA-NOTES.md`.
- **Dataset:** 29,184 stations / 39,640 chargers, 36 states/UTs, 70 operators, 115 suspect coordinates flagged, 1 row rejected.
- **API (branch):** strict validation, per-gun filters, paged radius search, `/v1/cities`, attribution on every response, CDN caching, 429 + Retry-After. `npm test` → 119 pass, 0 fail.
- **Frontend (branch):** real data, new filters, MapLibre fixed, graphite + amber palette (`PICKS.md`). Mobile-check: no blockers/majors (`MOBILE.md`). Frontend tests 18 + 2 pass, SEO 0 errors.
- **Plan:** `PLAN.md` (Phases 5–7, checker: 3 phases / 12 tasks). Previous plan archived at `DOCS/WORK/2026-10-15/PLAN-bee-rebuild-phases-1-4.md`.

## Constraints and blockers

- No merge or push to `main` without the owner's explicit go-ahead (any push to `main` deploys production). Pushing the branch for a preview is allowed (PLAN Task 6.3).
- Never stop the servers on ports 3000/5173 (another agent's). They lock `frontend/node_modules`, so `npm run verify` fails locally on `npm ci` EPERM — use the split verify in `PLAN.md` Rules.
- Git Bash: `export MSYS_NO_PATHCONV=1` before commands that pass `/route` arguments.
- Owner inputs that may be needed: a Vercel preview protection-bypass secret (Task 6.3).

## Next up (start here)

1. `PLAN.md` Phase 5, Task 5.1: write `backend/test/vercel-config.test.js` (3 tests fail first), then add `"regions": ["bom1"]`, set `includeFiles` to `backend/data/**`, drop the `/v1/(.*)` Cache-Control header.
2. Then Tasks 5.2 (check-upstream script), 5.3 (CI + weekly BEE workflow), 5.4 (api.json, docs string, README, DECISIONS).
3. Phase 6: review, smoke script, branch preview, guide checks — ends with a STOP for the owner.
4. Phase 7 only after the owner says "merge to main".
