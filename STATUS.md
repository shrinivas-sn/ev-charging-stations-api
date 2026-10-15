# Project Status: India EV Charging Station Directory API

Last Updated: 2026-10-15
Phase: Rebuilding on real BEE data — Phase 6 done except the preview smoke, which Vercel Authentication blocks until the owner supplies a protection-bypass secret; waiting for the owner's go-ahead to merge to main

## Current State

- **Path / branch:** `E:\OSC\api-projects\projects\ev-charging-stations-api`, branch `rebuild/bee-real-data` (local only, never pushed). Nothing is on `main`; the owner has not authorised a merge.
- **Live site** (`https://ev-charging-stations-api.vercel.app`, deployed from `main`): still serves the old generated sample (28,698 invented stations) until the rebuild ships.
- **Real source:** BEE "EV Public Charging Stations Data till 26th October 2025" (PDF, http only). Republished with attribution; BEE publishes no licence. Notes: `DOCS/DATA-NOTES.md`.
- **Dataset:** 29,184 stations / 39,640 chargers, 36 states/UTs, 70 operators, 115 suspect coordinates flagged, 1 row rejected.
- **API (branch):** strict validation, per-gun filters, paged radius search, `/v1/cities`, attribution on every response, CDN caching, 429 + Retry-After. `npm test` → 133 pass, 0 fail.
- **Frontend (branch):** real data, new filters, MapLibre fixed, graphite + amber palette (`PICKS.md`). Mobile-check: no blockers/majors (`MOBILE.md`). Frontend tests 18 + 2 pass, SEO 0 errors.
- **Deploy config:** `vercel.json` runs the function in `bom1` and ships `backend/data/**`; CI (`ci`) is green on the pushed branch (run 38763956143: 133 backend + 18 frontend + 2 build tests, build, SEO 0 errors).
- **Preview:** `rebuild/bee-real-data` is pushed; preview deployment `7097443039` is `success` at `https://ev-charging-stations-api-1zp4-n93pkug3p-shrinivas-sns-projects.vercel.app`, but every path answers `302 Protected by Vercel Authentication`, so `scripts/smoke.mjs` has not run against it.
- **Plan:** `PLAN.md` (Phases 5–7, checker: 3 phases / 12 tasks). Previous plan archived at `DOCS/WORK/2026-10-15/PLAN-bee-rebuild-phases-1-4.md`.

## Constraints and blockers

- No merge or push to `main` without the owner's explicit go-ahead (any push to `main` deploys production). Pushing the branch for a preview is allowed (PLAN Task 6.3).
- Never stop the servers on ports 3000/5173 (another agent's). They lock `frontend/node_modules`, so `npm run verify` fails locally on `npm ci` EPERM — use the split verify in `PLAN.md` Rules.
- No AI slop: every prose step passes `no-ai-slop-writing` Detect; UI follows `slop-signatures.md` + `banned-patterns.md`; code matches its file's style (`PLAN.md` Rules).
- Git Bash: `export MSYS_NO_PATHCONV=1` before commands that pass `/route` arguments.
- Owner inputs that may be needed: a Vercel preview protection-bypass secret (Task 6.3).

## Next up (start here)

1. Owner: give a Vercel "Protection Bypass for Automation" secret (or turn preview protection off for this project) so `node scripts/smoke.mjs --base <preview-url>` and the `::bom1::` region check can run — the one Phase 6 verification still open.
2. Owner: say "merge to main" to start Phase 7 (Task 7.1 opens the PR and merges; every push to `main` deploys production).
3. Not fixed, logged: the prerender step prints a `useLayoutEffect` SSR warning from react-router (Plan issue 4).
