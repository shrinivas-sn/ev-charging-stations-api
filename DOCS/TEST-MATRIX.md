# Test matrix — rebuild on BEE data

Mode: **plan** (new work; `PLAN.md` is the intended contract). Method:
`E:\dev-recipes\_knowledge\testing-method.md`; reused scenarios from
`_knowledge/test-patterns.yaml` (`api-endpoint`, `search`, `discoverability`) are named in
the row's Must prove. Every row starts `unproven` and names the `PLAN.md` task that proves it.

Runner facts (from files): backend `node --test` via `npm test` → `npm --prefix backend test`
(`backend/package.json` `"test": "node --test"`); tests start the Express app on an ephemeral
port (`backend/test/api.test.js`, `http.createServer(app)`). Frontend has no test runner yet;
`node --test` on `.mjs` files is used (Node ≥ 20). Python `unittest` for `ingest/`. No CI exists
yet (`.github/` absent) — Task 5.2 adds it.

## 1. Surface map

| Surface ID | Inputs and callers | Outputs and observers | State kept | External effects | Dependencies | Start, stop, install, update, remove | Evidence or unknown |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 PDF extraction | BEE PDF path, `--pages` (operator, CI) | `ingest/out/raw-rows.json` | none | reads file; download via curl | pdfplumber 0.11.4, Python ≥ 3.10, BEE site over HTTP | venv install; run per refresh | PLAN Task 2.1; Facts rows on PDF |
| S2 Normalise and build | raw rows JSON, reference tables | `backend/data/stations.json`, `meta.json`, `rejects.json`, `source.json` | committed data files | writes files | Node ≥ 20 | run per refresh; output committed | PLAN Tasks 2.2–2.4 |
| S3 `/v1` endpoints | HTTP GET from developers, playground | JSON envelopes | in-memory indexes built on first request | none | Express 5.3.0, data files | process start / serverless cold start | PLAN Phase 3 contract table |
| S4 HTTP layer | any method/path/header | status, headers (CORS, cache, rate limit), error envelope | per-instance rate-limit counters | none | cors 2.8.6, express-rate-limit 7.5.1, Vercel CDN | per instance | PLAN Tasks 3.2, 3.6; Vercel brief |
| S5 Playground | user typing, selects, geolocation, Load more | list, counts, errors, countdown | React state | API requests | `/v1/stations/near`, `/v1/connectors` | page load | `frontend/src/pages/PlaygroundPage.jsx`; PLAN Task 4.2 |
| S6 Map | stations array, selection | MapLibre canvas, markers, popup | map instance | tile requests to OpenFreeMap | maplibre-gl 4.7.1, WebGL | mount/unmount | `frontend/src/components/StationMap.jsx`; PLAN Task 4.3 |
| S7 Prerender/SEO | `npm run build`, `SITE_URL` | `dist/` pages, sitemap, robots, 404.html | none | writes `dist/` | Vite 5.4.21, `scripts/prerender.mjs` | per build | PLAN Task 4.1, 4.4 |
| S8 Upstream check | weekly cron, manual dispatch | JSON status, exit code, GitHub issue | `backend/data/source.json` (read) | HTTP to BEE, issue creation | GitHub Actions, gh CLI | scheduled | PLAN Task 5.2 |
| S9 Deployment | push to branch (preview) / `main` (production) | Vercel deployment, region, routes | Vercel project config | public site | `vercel.json`, Vercel GitHub integration | per push | PLAN Tasks 5.1, 6.2, 6.3 |

## 2. Failure questions

`a` = applies (scenario row id), `n/a` = does not apply (reason).

| Surface | Invalid/hostile input | Dependency trouble | Concurrency/ordering | Interruption/restart | Resources left | Update/old state | Platform/env | Secrets/permissions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | a: X-03 (missing cell), X-04 (unknown header) | a: X-05 (download returns HTML) | n/a — single-process batch | a: X-06 (partial output not written on crash: write to temp then rename) | n/a — no locks; cache dir gitignored | a: X-07 (new PDF layout detected) | a: X-08 (Windows/Linux same output) | n/a — public file, no credentials |
| S2 | a: B-01…B-12 | a: B-13 (missing reference table → explicit error) | n/a — single-process batch | a: B-14 (deterministic re-run) | n/a — writes only target files | a: B-15 (ids stable across refresh) | a: X-08 | n/a — no credentials |
| S3 | a: E-01…E-30 | a: E-31 (data file missing → 500 envelope, no detail) | n/a — read-only in-memory data; no writes | a: E-32 (cold start loads once) | n/a — no handles kept | a: E-33 (old integer id → 400) | a: D-03 (bundle includes data) | n/a — public read-only data, no auth (see Decisions) |
| S4 | a: H-01…H-08 | a: H-09 (CDN caches only intended statuses) | a: H-07 (separate clients separate budgets) | n/a — stateless apart from counters that reset on restart by design | n/a | n/a — no stored state | a: H-10 (trust proxy only behind Vercel) | n/a — no credentials; CORS `*` is owner policy |
| S5 | a: P-01, P-02 | a: P-03 (API error / 429 / network) | a: P-04 (out-of-order responses) | n/a — no persistence | n/a | n/a | a: P-05 (geolocation denied) | n/a |
| S6 | a: M-03 (station with no coordinates) | a: M-04 (tiles/WebGL fail → list still usable) | n/a — single map instance | n/a | a: M-05 (map removed on unmount) | n/a | a: M-04 | n/a |
| S7 | n/a — build inputs are repo files | a: G-03 (SITE_URL missing → canonical omitted, warning) | n/a | n/a | n/a | a: G-04 (numbers derived from current data) | n/a | n/a |
| S8 | a: U-03 (anchor missing), U-04 (HTML not PDF) | a: U-05 (BEE unreachable → exit 1, no false drift) | a: U-06 (no duplicate issue) | n/a — stateless job | n/a | a: U-02 (changed file detected) | a: U-05 | a: U-07 (only `GITHUB_TOKEN`, `issues: write`) |
| S9 | n/a — config is repo-controlled | a: D-04 (preview smoke before production) | n/a | a: D-05 (rollback path) | n/a | a: D-05 | a: D-01, D-02 | n/a — no secrets in config |

## 3. Scenarios

| ID | Surface | Must prove | Forbidden evidence | Level | Test | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| X-01 | S1 | Page 1 extracts 29 data rows; row 1 latitude cell is `12.034186` | Counting rows of a hand-made fixture instead of the real PDF page | integration | `ingest/test_extract.py` (Task 2.1) | unproven | |
| X-02 | S1 | Full run yields 39,641 rows, all 12 cells wide | Asserting only that the output file exists | integration | full run log (Task 2.1 Verify) | unproven | |
| X-03 | S1 | The last row of each page recovers its connector count from page text (page 1 row 29 = `1`); `missing_cells` = 0 | Defaulting a missing count to 1 | integration | `ingest/test_extract.py` (Task 2.1) | unproven | |
| X-04 | S1 | A page whose header row differs from the 12 known columns stops extraction with the page number | Silently mapping columns by position | unit | `ingest/test_extract.py` (Task 2.1) | unproven | |
| X-05 | S1 | Download that returns HTML (not `%PDF`) fails before extraction | Extracting from an HTML error page | unit | `ingest/fetch_bee_pdf.sh` check + test (Task 2.1) | unproven | |
| X-06 | S1 | Output is written to a temp file and renamed only on success | A truncated JSON left after a crash | unit | `ingest/test_extract.py` (Task 2.1) | unproven | |
| X-07 | S1 | Page count/columns differing from the Facts are reported in output metadata | Hard-coding 1,159 pages | unit | `ingest/test_extract.py` (Task 2.1) | unproven | |
| X-08 | S1/S2 | Build output sha256 is identical on two runs | One run only | integration | `backend/test/normalise.test.js` (Task 2.3) | unproven | |
| B-01 | S2 | Each of the 19 raw charger-type spellings maps to its standards; the 4 Combo spellings yield multiple standards | Testing 2–3 spellings and assuming the rest | unit | `backend/test/reference.test.js` (Task 2.2) | unproven | |
| B-02 | S2 | An unknown charger type fails the build listing the value | A catch-all mapping to "Other" | unit | `backend/test/normalise.test.js` (Task 2.3) | unproven | |
| B-03 | S2 | Every observed state spelling (46) resolves to one of 36 states/UTs with an ISO code | Lower-casing only, without the D&NH/Uttrakhand cases | unit | `backend/test/reference.test.js` (Task 2.2) | unproven | |
| B-04 | S2 | Every observed CPO spelling (70) resolves, incl. wrap-broken names | Only testing well-formed names | unit | `backend/test/reference.test.js` (Task 2.2) | unproven | |
| B-05 | S2 | lat == lng or out-of-India coordinates → `location_quality: "suspect"`, station kept | Dropping the rows silently | unit | `backend/test/normalise.test.js` (Task 2.3) | unproven | |
| B-06 | S2 | Malformed number (`12.5abc`, empty) → row in `rejects.json` with reason | `parseFloat` accepting a prefix | unit | `backend/test/normalise.test.js` (Task 2.3) | unproven | |
| B-07 | S2 | Identical rows → one charger entry with `count` = number of rows | Deduplicating identical rows away | unit | `backend/test/normalise.test.js` (Task 2.3) | unproven | |
| B-08 | S2 | Different charger rows at the same operator+coordinates → one station, separate charger entries | Grouping by address text | unit | `backend/test/normalise.test.js` (Task 2.3) | unproven | |
| B-09 | S2 | Two operators at identical coordinates → two stations | Grouping by coordinates alone | unit | `backend/test/normalise.test.js` (Task 2.3) | unproven | |
| B-10 | S2 | Station ids match `^evs_[0-9a-f]{10}$`, unique across the full dataset | Checking uniqueness on the fixture only | integration | `backend/test/dataset.test.js` (Task 2.4) | unproven | |
| B-11 | S2 | Committed dataset: ≥ 25,000 stations, no `generated-sample` string, attribution equals the Rules text | Asserting file size | integration | `backend/test/dataset.test.js` (Task 2.4) | unproven | |
| B-12 | S2 | `max_charger_kw`, `currents`, `vehicle_classes` derive from charger entries | Using summed capacity | unit | `backend/test/normalise.test.js` (Task 2.3) | unproven | |
| B-13 | S2 | A missing or malformed reference table stops the build with the file name | Undefined-property crash with a stack trace only | unit | `backend/test/normalise.test.js` (Task 2.3) | unproven | |
| B-14 | S2 | Re-running the build on the same input changes no committed byte | `built_at` = wall-clock time | integration | `backend/test/normalise.test.js` (Task 2.3) | unproven | |
| B-15 | S2 | The same station keeps its id when unrelated rows are added | Ids from row order | unit | `backend/test/normalise.test.js` (Task 2.3) | unproven | |
| E-01 | S3 | `/v1/stations` default returns 25 items and `meta.total` = dataset station count | Asserting `data.length > 0` | integration | `backend/test/api.test.js` (Task 3.1) | unproven | |
| E-02 | S3 | `/v1/stations/:id` round-trips an id from the list | Hard-coded id `1` | integration | `backend/test/api.test.js` (Task 3.1) | unproven | |
| E-03 | S3 | `/v1/states` station counts sum to the total | Count of states only | integration | `backend/test/api.test.js` (Task 3.1) | unproven | |
| E-04 | S3 | Unknown parameter (`min_power`, `offset`) → 400 `UNKNOWN_PARAMETER` with allowed names | Unfiltered 200 | integration | `backend/test/api.test.js` (Task 3.2) | unproven | |
| E-05 | S3 | Unknown state/operator/connector/vehicle/ownership/current → 404 with `details.valid_values` | 400 without the list, or 200 empty | integration | `backend/test/api.test.js` (Task 3.2, 3.3) | unproven | |
| E-06 | S3 | Repeated parameter (`state=MH&state=KA`) → 400 | Joining values with a comma | integration | `backend/test/api.test.js` (Task 3.2) | unproven | |
| E-07 | S3 | `0x10`, `1e1`, `Infinity`, `12abc` → 400 for every numeric parameter | Testing one parameter | integration | `backend/test/api.test.js` (Task 3.2) | unproven | |
| E-08 | S3 | Empty numeric parameter uses the default | Treating empty as 0 | integration | `backend/test/api.test.js` (Task 3.2) | unproven | |
| E-09 | S3 | `limit` above 100 → 400 (pagination-bounded) | Default page size cited as the limit | integration | `backend/test/api.test.js` (Task 3.2) | unproven | |
| E-10 | S3 | Malformed id (`123`, `evs_xyz`) → 400 `INVALID_STATION_ID`; well-formed unknown → 404 | Integer parsing of the id | integration | `backend/test/api.test.js` (Task 3.2) | unproven | |
| E-11 | S3 | `vehicle=car` never returns a station whose only standards are LEV | Checking the first page only on a sorted list | integration | `backend/test/api.test.js` (Task 3.3) | unproven | |
| E-12 | S3 | `current=dc&min_power_kw=50` returns only stations with one DC charger ≥ 50 kW | Checking `max_charger_kw` without current | integration | `backend/test/api.test.js` (Task 3.3) | unproven | |
| E-13 | S3 | Filters combine on the same charger (AC 7.4 + DC 30 station does not match `current=ac&min_power_kw=30`) (search/filters-combine) | Testing each filter alone | unit | `backend/test/api.test.js` (Task 3.3) | unproven | |
| E-14 | S3 | `connector=CCS-2`, `CCS 2`, `ccs2` give the same total | One spelling | integration | `backend/test/api.test.js` (Task 3.3) | unproven | |
| E-15 | S3 | `operator=iocl` equals `operator=IOCL`; no substring matching | Partial match `a` accepted | integration | `backend/test/api.test.js` (Task 3.3) | unproven | |
| E-16 | S3 | `city=Bangalore` equals `city=Bengaluru`; a city present in two states returns both and lists them in `filters_applied.city_ambiguous_states` | Alias table present but untested | integration | `backend/test/api.test.js` (Task 3.3) | unproven | |
| E-17 | S3 | Unknown city → 404 with hint `/v1/cities?state=` | 200 empty | integration | `backend/test/api.test.js` (Task 3.3) | unproven | |
| E-18 | S3 | `ownership=govt` returns only govt operators | Count only | integration | `backend/test/api.test.js` (Task 3.3) | unproven | |
| E-19 | S3 | `/near` results sorted by distance then id; distances ≤ radius | Checking first item only | integration | `backend/test/api.test.js` (Task 3.4) | unproven | |
| E-20 | S3 | `/near` page 1 and 2 don't overlap and equal the first 2×limit of a single request | Single page | integration | `backend/test/api.test.js` (Task 3.4) | unproven | |
| E-21 | S3 | `/near` never returns a suspect-location station | A centre with no suspect stations nearby | integration | `backend/test/api.test.js` (Task 3.4) | unproven | |
| E-22 | S3 | `radius` 0, negative, > 100 → 400; missing lat/lng → 400 `MISSING_COORDINATES` | Silent default | integration | `backend/test/api.test.js` (Task 3.4) | unproven | |
| E-23 | S3 | Page beyond the end → 200 with empty `data` and correct `total_pages` | A 400 or 500 for a page past the end | integration | `backend/test/api.test.js` (Task 3.4) | unproven | |
| E-24 | S3 | `/v1/cities?state=KA` returns only Karnataka; unknown state → 404 | Checking the count without the state of each row | integration | `backend/test/api.test.js` (Task 3.5) | unproven | |
| E-25 | S3 | `/v1/operators` station counts sum to total | Comparing against a hard-coded number | integration | `backend/test/api.test.js` (Task 3.5) | unproven | |
| E-26 | S3 | `/v1/connectors` lists every standard with source URL and counts > 0 for CCS2 and LEV_AC | Asserting the list length only | integration | `backend/test/api.test.js` (Task 3.5) | unproven | |
| E-27 | S3 | Every `/v1` success response carries `meta.attribution` equal to the Rules text | Checking one route | integration | `backend/test/api.test.js` (Task 3.5) | unproven | |
| E-28 | S3 | `/v1/meta` counts equal the dataset's derived counts | Static numbers | integration | `backend/test/api.test.js` (Task 3.5) | unproven | |
| E-29 | S3 | Station payload never exposes internal index keys (`_stateKey` etc.) | Checking one sample station only | integration | `backend/test/api.test.js` (Task 3.1) | unproven | |
| E-30 | S3 | `/health` reports station count from data and `no-store` | A static count in the handler | integration | `backend/test/api.test.js` (Task 3.6) | unproven | |
| E-31 | S3 | An unhandled exception returns the 500 envelope with no stack, path or version (error-response-no-internal-detail) | Only the handled 400 path | integration | `backend/test/api.test.js` (Task 3.2) | unproven | |
| E-32 | S3 | Data loads once per process (second request does not re-read files) | Timing-only claim | unit | `backend/test/api.test.js` (Task 3.1) | unproven | |
| E-33 | S3 | Old integer id `/v1/stations/1` → 400 `INVALID_STATION_ID` | Integer ids silently resolving to a station | integration | `backend/test/api.test.js` (Task 3.2) | unproven | |
| H-01 | S4 | `POST`/`PUT`/`DELETE` on a known route → 405 with `Allow: GET, HEAD, OPTIONS` (method-and-cors-restricted, method half) | Handler only implementing GET cited as proof | integration | `backend/test/api.test.js` (Task 3.2) | unproven | |
| H-02 | S4 | Unknown path → 404 JSON envelope | An HTML 404 from the framework | integration | `backend/test/api.test.js` (Task 3.2) | unproven | |
| H-03 | S4 | CORS: `Access-Control-Allow-Origin: *` on GET and preflight (owner policy: public keyless API, CONVENTIONS) | Checking GET only, never the OPTIONS preflight | integration | `backend/test/api.test.js` (Task 3.6) | unproven | |
| H-04 | S4 | 200 and 404 `/v1` responses: `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` | vercel.json header assumed | integration | `backend/test/api.test.js` (Task 3.6) | unproven | |
| H-05 | S4 | 400/405/429/500 responses: `Cache-Control: no-store` | Checking only the 400 path | integration | `backend/test/api.test.js` (Task 3.6) | unproven | |
| H-06 | S4 | Requests past `RATE_LIMIT_MAX` in the window → 429 envelope with numeric `Retry-After` > 0 (rate-limit-enforced) | Library present in middleware, threshold never exceeded | integration | `backend/test/ratelimit.test.js` (Task 3.6) | unproven | |
| H-07 | S4 | A different `X-Forwarded-For` gets its own budget | Single client | integration | `backend/test/ratelimit.test.js` (Task 3.6) | unproven | |
| H-08 | S4 | Cacheable 200 responses carry no `RateLimit-*` headers | Checking a 429 response instead of a 200 | integration | `backend/test/api.test.js` (Task 3.6) | unproven | |
| H-09 | S4 | On the live deployment a repeated `/v1` GET returns `x-vercel-cache: HIT` and a 400 never does | Local headers only | e2e | `scripts/smoke.mjs` (Task 6.2) | unproven | |
| H-10 | S4 | Trust-proxy hop count is 1 and documented as Vercel-only; local `npm start` notes the spoofing caveat in README | Trusting XFF hops without a documented proxy | review | README + `backend/src/app.js` (Task 5.3) | unproven | |
| P-01 | S5 | Typing a half-finished latitude fires no request until the debounce settles with a valid value | One request per keystroke | manual | Task 4.2 Verify (browser) | unproven | |
| P-02 | S5 | `buildNearQuery` emits exactly the documented string and omits empty filters | Snapshot of an unrelated object | unit | `frontend/src/lib/api.test.mjs` (Task 4.2) | unproven | |
| P-03 | S5 | A 429 shows a countdown from `Retry-After` and disables Run; a 400 marks results stale | Reading the error state in code instead of the screen | manual | Task 4.2 Verify (browser, `RATE_LIMIT_MAX=2`) | unproven | |
| P-04 | S5 | Changing filters quickly leaves only the last request's results (search/rapid-input-no-stale-results) | Single query | manual | Task 4.2 Verify (browser) | unproven | |
| P-05 | S5 | Geolocation denied shows an inline message, no `alert()` | Asserting no exception without looking at the page | manual | Task 4.2 Verify (browser) | unproven | |
| P-06 | S5 | Car + DC + 50 kW at Bengaluru shows only DC ≥ 50 kW stations; Load more appends without duplicates | Checking the first item only | manual | Task 4.2 Verify (browser) | unproven | |
| M-01 | S6 | Built CSS contains MapLibre rules (`maplibregl-popup-anchor`) | Import line present in source only | integration | `frontend/scripts/verify-build.test.mjs` (Task 4.3) | unproven | |
| M-02 | S6 | Clicking a marker opens an anchored popup; OSM link opens the station's coordinates | Popup DOM present but unpositioned | manual | Task 4.3 Verify (browser) | unproven | |
| M-03 | S6 | Stations without finite coordinates are not drawn | Filtering only in test data | unit | `frontend/src/lib/*.test.mjs` (Task 4.3) | unproven | |
| M-04 | S6 | If MapLibre/WebGL fails, the list remains usable and the map shows its unavailable state | Testing with WebGL available only | manual | Task 4.3 Verify (browser, WebGL disabled) | unproven | |
| M-05 | S6 | Map instance removed on unmount (navigate away and back, no duplicate canvas) | Single mount only | manual | Task 4.3 Verify (browser) | unproven | |
| G-01 | S7 | Every page has its own title/description/canonical in raw HTML (discoverability/raw-html-carries-metadata, routes-differ-from-each-other) | Checking the dev server DOM after JS | integration | `npm run verify:seo` (Task 4.4) | unproven | |
| G-02 | S7 | Every `/v1` path and parameter named in DocsPage exists in the backend param spec | A docs list copied from the spec by hand | unit | `frontend/scripts/docs-parity.test.mjs` (Task 4.4) | unproven | |
| G-03 | S7 | Production build always has `SITE_URL` (from `frontend/.env.production`) → sitemap and robots emitted | Root `.env.production` | integration | `npm run build` output (Task 4.1) | unproven | |
| G-04 | S7 | Site numbers equal `meta.json` counts | Hard-coded numbers | unit | `frontend/scripts/dataset-summary.test.mjs` (Task 4.1) | unproven | |
| G-05 | S7 | No "generated sample" / "not official" / data.gov.in claims in README, api.json, frontend | Searching only one of the three locations | integration | grep in Task 5.3 Verify | unproven | |
| U-01 | S8 | Same upstream file → exit 0 | Live network in the unit test | unit | `backend/test/check-upstream.test.js` (Task 5.2) | unproven | |
| U-02 | S8 | New href or size → exit 2 with both versions in JSON | Checking the exit code without the JSON | unit | `backend/test/check-upstream.test.js` (Task 5.2) | unproven | |
| U-03 | S8 | Page without the anchor → exit 1 | Exit 0 "no change" | unit | `backend/test/check-upstream.test.js` (Task 5.2) | unproven | |
| U-04 | S8 | HTML returned instead of PDF → exit 1 | Hashing whatever bytes arrive | unit | `backend/test/check-upstream.test.js` (Task 5.2) | unproven | |
| U-05 | S8 | Network error → exit 1, never exit 2 | A timeout treated as no change | unit | `backend/test/check-upstream.test.js` (Task 5.2) | unproven | |
| U-06 | S8 | Workflow skips issue creation when one labelled `upstream-drift` is open | Creating a fresh label each run | review | `.github/workflows/upstream-check.yml` (Task 5.2) | unproven | |
| U-07 | S8 | Workflow permissions are `contents: read`, `issues: write` only | Inheriting default write-all permissions | review | `.github/workflows/upstream-check.yml` (Task 5.2) | unproven | |
| D-01 | S9 | `vercel.json`: `regions` = `["bom1"]`, no page wildcard rewrite, `framework: vite`, `includeFiles` covers data | Reading vercel.json by eye | unit | `backend/test/vercel-config.test.js` (Task 5.1) | unproven | |
| D-02 | S9 | Deployed function runs in bom1 (`x-vercel-id` contains `::bom1::`) | Config file only | e2e | `scripts/smoke.mjs` (Task 6.2) | unproven | |
| D-03 | S9 | Deployed `/v1/stations` answers 200 (data shipped with function) | Local run | e2e | `scripts/smoke.mjs` (Task 6.2) | unproven | |
| D-04 | S9 | Preview deployment passes the smoke script before any production merge | Skipping preview and testing production first | e2e | `scripts/smoke.mjs` (Task 6.2) | unproven | |
| D-05 | S9 | Production smoke + production checklist pass after merge; rollback command recorded | A merge without a recorded rollback | e2e | Task 6.3 (needs owner go-ahead) | unproven | |
| D-06 | S9 | Clean-clone `npm install && npm run verify` passes | Running in the dev working tree only | e2e | Phase 6 Re-check | unproven | |

## Decisions and limits

- `api-endpoint` scenarios `object-authz-enforced`, `function-authz-enforced` and `mass-assignment-blocked` do not apply: the API is public, read-only and keyless, with no accounts or writes (`PLAN.md` Goal; CONVENTIONS "No API key, no signup").
- `method-and-cors-restricted` CORS half: a wildcard origin is owner policy for this keyless public API (CONVENTIONS "CORS enabled for all origins"); H-03 proves the policy is applied, not that it is restricted.
- `pagination-stable-under-write` does not apply at runtime: the dataset is immutable between deployments.
- Manual rows (P-*, M-02, M-04, M-05) are browser checks; no automated browser suite exists. Their evidence must name what was seen, by whom, and when.
- The in-memory rate limit is per serverless instance; H-06/H-07 prove the application's limiter, not a global limit across instances.
- e2e rows (D-*, H-09) need a deployed preview or production; production rows wait for the owner's go-ahead to merge.
