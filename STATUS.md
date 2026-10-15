# Project Status: India EV Charging Station Directory API

Last Updated: 2026-10-15
Phase: Live on BEE data (29184 stations, till 26 Oct 2025); production checks pass.

## Current State

- **Repo / main:** `E:\OSC\api-projects\projects\ev-charging-stations-api`, released from `main`. PR #1 merged the BEE rebuild as `a6bfb72`; PR #2 fixed the manifest's `near` route as `d307644` (branch `fix/manifest-near-route` kept).
- **Live site:** `https://ev-charging-stations-api.vercel.app` serves BEE's "EV Public Charging Stations Data till 26th October 2025". Production deployment `7098515522` → `success`; `/health` answers 200.
- **Source:** the BEE PDF (http only), sha256 `f519218fa96a04f57b3c56e919a8045133e7df1307a77710cca0076ab25b6882`, 7942286 bytes. BEE publishes no licence; the owner chose republishing with attribution, and every API response carries that string. Notes: `DOCS/DATA-NOTES.md`.
- **Dataset:** 29,184 stations / 39,640 chargers / 44,065 connectors, 36 states and union territories, 70 operators, 115 suspect coordinates flagged, 1 row rejected.
- **API:** strict validation, per-gun filters, paged radius search, `/v1/cities`, CDN caching, 429 with Retry-After. `npm test` → 134 pass, 0 fail; the 134th is `backend/test/manifest-routes.test.js`, which requests every api route in `api.json` and asserts 200 JSON.
- **Frontend:** real data, new filters, MapLibre with OpenFreeMap tiles, graphite and amber palette (`PICKS.md`). Mobile-check has no blockers or majors (`MOBILE.md`); frontend 18 + 2 tests pass, SEO 0 errors.
- **Deploy config:** `vercel.json` runs the function in `bom1`, confirmed by the smoke script's `::bom1::` check, and ships `backend/data/**`. CI is green on both merges.
- **Evidence:** production checklist `api-projects/checklists/ev-charging-stations/production.md` (14 rows, no FAIL); hub records in OSC commits `f30bf4c` and `b9a8582`, not pushed; the plan's history in `DOCS/WORK/2026-10-15/RELEASE.md`.

## Constraints and blockers

- The owner authorised merges to `main` on 15/10/2026 for this release. Any push to `main` deploys production, so ask again before the next one.
- Never stop the servers on ports 3000/5173 (another agent's). They lock `frontend/node_modules`, so `npm run verify` fails locally on `npm ci` EPERM. Run its five steps instead: `npm test`, `npm --prefix frontend test`, `npm --prefix frontend run build` (expect `[prerender] Rendered 8 pages and 404.html.`), `npm --prefix frontend run test:build`, `npm run verify:seo` (expect 0 errors).
- The prerender step prints a `useLayoutEffect` SSR warning from react-router. Logged, not fixed: a fix means changing a dependency, and the emitted HTML is unaffected.
- Git Bash: `export MSYS_NO_PATHCONV=1` before commands that pass `/route` arguments.

## Next up (start here)

1. Owner's call: the public-apis submission. Its `pre-pr` checklist fails `row-shape`, because the row derived from `api.json` has a 178-character description against a 100-character limit and ends with a period; `api.json` can carry a shorter row. The same stage warns that open upstream PRs already mention EV.
2. Owner's call: body text at 16px and 44px tap targets (`MOBILE.md`), route or corridor search, and bulk download.
3. Nothing needs fixing on production. Re-run `run-checks.js --stage production` after any change to the manifest, the pages or the guides.
